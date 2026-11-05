"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageCircle,
    X as XIcon,
    Bot,
    User,
    Sparkles,
    Wifi,
    WifiOff,
    Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { stageTable } from "@/utils/lineage-api";

interface ChatMessage {
    id: string;
    content: string;
    sender: "user" | "bot";
    timestamp: Date;
    type?: "text" | "error";
}

interface EltPipelineChatWidgetProps {
    initialBotMessage: string;
    tableId: string;
    tableName: string;
    companyId: string;
    // Callback to close or reset the view
    onClose: () => void;
}

export function EltPipelineChatWidget({
    initialBotMessage,
    tableId,
    tableName,
    companyId,
    onClose,
}: EltPipelineChatWidgetProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "1",
            content: initialBotMessage,
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const messageContent = inputMessage.trim();

        // Add user message
        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            content: messageContent,
            sender: "user",
            timestamp: new Date(),
            type: "text",
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setIsTyping(true);

        const lowerContent = messageContent.toLowerCase();
        const isAffirmative = /yes|sure|ok|start|confirm|go ahead/i.test(lowerContent);
        const isNegative = /no|cancel|stop/i.test(lowerContent);

        if (isAffirmative) {
            // Auto-detect destination — no need to ask the user
            try {
                const response = await stageTable({
                    company_id: companyId,
                    table_id: tableId,
                    // No destination_connector_id — backend auto-detects from repository connector
                });

                setIsTyping(false);

                if (response.success) {
                    setMessages((prev) => [...prev, {
                        id: `bot-${Date.now()}`,
                        content: `Pipeline triggered successfully! The system auto-detected your configured repository.\n\nStatus: **${response.status || "Completed"}**\nRecords Processed: **${response.records_processed ?? 0}**`,
                        sender: "bot",
                        timestamp: new Date(),
                    }]);
                } else {
                    setMessages((prev) => [...prev, {
                        id: `bot-${Date.now()}`,
                        content: `Failed to trigger pipeline.\n\nReason: ${response.message || "Unknown error"}.`,
                        sender: "bot",
                        timestamp: new Date(),
                        type: "error"
                    }]);
                }
            } catch (error: any) {
                setIsTyping(false);
                const errorDetail = error?.response?.data?.detail || error.message || "Unknown error";
                const isNoRepo = errorDetail.includes("No repository connector configured");

                setMessages((prev) => [...prev, {
                    id: `bot-${Date.now()}`,
                    content: isNoRepo
                        ? "No repository connector is configured for your company. Please go to **CoreOS → Connector Settings** and tag a connector (e.g. BigQuery) as a **Repository** first."
                        : `Error triggering pipeline: ${errorDetail}`,
                    sender: "bot",
                    timestamp: new Date(),
                    type: "error"
                }]);
            }
        } else if (isNegative) {
            setIsTyping(false);
            setMessages((prev) => [...prev, {
                id: `bot-${Date.now()}`,
                content: "Cancelled. Let me know if you change your mind.",
                sender: "bot",
                timestamp: new Date(),
            }]);
        } else {
            // Fallback for unclear input
            setTimeout(() => {
                setIsTyping(false);
                setMessages((prev) => [...prev, {
                    id: `bot-${Date.now()}`,
                    content: "I didn't quite catch that. Type **'Yes'** to stage this table to your configured repository, or **'No'** to cancel.",
                    sender: "bot",
                    timestamp: new Date(),
                }]);
            }, 800);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Simplified formatter since we don't have the sophisticated one from FloatingChatWidget
    // but the user wants it to look similar.
    const formatMessageContent = (content: string) => {
        const lines = content.split('\n');
        let inList = false;
        let html = "";

        lines.forEach((line, index) => {
            let processedLine = line
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-900">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em class="italic text-blue-800/80">$1</em>')
                .replace(/_(.*?)_/g, '<em class="italic text-blue-800/80">$1</em>');

            if (processedLine.trim().startsWith('- ') || processedLine.trim().startsWith('* ')) {
                if (!inList) {
                    html += '<ul class="space-y-1.5 my-3">';
                    inList = true;
                }
                const bulletContent = processedLine.trim().substring(2);
                html += `<li class="flex items-start gap-2 text-blue-800/90 italic">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></span>
                    <span>${bulletContent}</span>
                </li>`;
            } else {
                if (inList) {
                    html += '</ul>';
                    inList = false;
                }
                if (processedLine.trim() === "" && index !== lines.length - 1) {
                    html += '<div class="h-2"></div>';
                } else {
                    html += `<div>${processedLine}</div>`;
                }
            }
        });

        if (inList) html += '</ul>';
        return html;
    };


    // Re-creating the UI from FloatingChatWidget
    return (
        <motion.div
            className="w-full h-[600px] relative z-0 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <Card className="flex flex-col overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 w-full h-full shadow-sm rounded-[2.5rem] relative py-0">

                {/* Gradient Background Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10" />

                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-700 border-b border-white/20 relative overflow-hidden rounded-t-[2.5rem]">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    {/* Note: animate-shimmer might need custom config, using simplified version if class not present */}

                    <div className="flex items-center space-x-3 relative z-10">
                        <Bot className="w-6 h-6 text-white" />
                        <div className="flex flex-col">
                            <span className="font-semibold text-white">ELT Assistant</span>
                            <div className="flex items-center space-x-1">
                                <Wifi className="w-3 h-3 text-green-300" />
                                <span className="text-xs text-blue-100">Active</span>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-1 h-8 w-8 relative z-10"
                    >
                        <XIcon className="w-4 h-4" />
                    </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 relative z-10">
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                <div
                                    className={`flex space-x-2 max-w-[85%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                                        }`}
                                >
                                    <div
                                        className={cn(
                                            "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg",
                                            message.sender === "user"
                                                ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                                : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
                                        )}
                                    >
                                        {message.sender === "user" ? (
                                            <User className="w-4 h-4 text-white" />
                                        ) : (
                                            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>

                                    <div
                                        className={`flex flex-col ${message.sender === "user" ? "items-end" : "items-start"
                                            }`}
                                    >
                                        <div
                                            className={cn(
                                                "px-4 py-3 rounded-2xl backdrop-blur-sm shadow-lg",
                                                message.sender === "user"
                                                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                                                    : "bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-700/50"
                                            )}
                                        >
                                            <div
                                                className="text-sm leading-relaxed"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatMessageContent(message.content),
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            {formatTime(message.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {isTyping && (
                            <motion.div
                                className="flex justify-start"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex space-x-2 max-w-[100%]">
                                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-2 border-white/20 shadow-lg flex items-center justify-center">
                                        <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl px-4 py-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                                        <div className="flex space-x-1 items-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">
                                                Thinking
                                            </span>
                                            <div className="flex space-x-1">
                                                <motion.div
                                                    className="w-2 h-2 bg-blue-500 rounded-full"
                                                    animate={{ scale: [1, 1.5, 1] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                                                />
                                                <motion.div
                                                    className="w-2 h-2 bg-blue-500 rounded-full"
                                                    animate={{ scale: [1, 1.5, 1] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                                />
                                                <motion.div
                                                    className="w-2 h-2 bg-blue-500 rounded-full"
                                                    animate={{ scale: [1, 1.5, 1] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 relative z-10">
                    <div className="flex space-x-3">
                        <div className="flex-1 relative">
                            <Input
                                ref={inputRef}
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type 'Yes' to confirm..."
                                className={cn(
                                    "w-full text-sm bg-white/80 dark:bg-gray-800/80 border border-gray-300/50 dark:border-gray-600/50",
                                    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 backdrop-blur-sm rounded-xl pr-12"
                                )}
                                disabled={isTyping}
                            />
                        </div>
                        <Button
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isTyping}
                            size="sm"
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 rounded-xl"
                        >
                            <Sparkles className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
