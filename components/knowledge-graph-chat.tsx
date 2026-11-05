"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageCircle,
    X,
    Send,
    Bot,
    User,
    Zap,
    Sparkles,
    Wifi,
    WifiOff,
    Brain,
    Lightbulb,
    ThumbsUp,
    ThumbsDown,
    Info,
    ChevronDown,
    ChevronUp,
    Database,
    ShieldCheck,
    Link as LinkIcon,
    BookOpen,
    UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useSocketIO } from "@/contexts/socketio-context";
import { useOrchestratorMessages } from "@/app/store/orchestratorStore";
import { Axios } from "@/app/config/axios";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEmployees } from "@/hooks/use-employees";

interface ChatMessage {
    id: string;
    content: string;
    sender: "user" | "bot";
    timestamp: Date;
    type?: "suggestion" | "error" | "text";
    sources?: Array<{
        type: "field" | "asset" | "governance";
        label: string;
        description?: string;
    }>;
    feedback?: "positive" | "negative";
}

interface KnowledgeGraphChatProps {
    tableMetadata: any;
    columns: any[];
    companyId: string;
    tableId: string;
    contextPage: string;
    label: string;
    onClose?: () => void;
    initialSuggestions?: any[];
}

export function KnowledgeGraphChat({
    tableMetadata,
    columns,
    companyId,
    tableId,
    contextPage,
    label,
    onClose,
    initialSuggestions,
}: KnowledgeGraphChatProps) {
    const { isConnected } = useSocketIO();
    const {
        messages: orchestratorMessages,
        clearMessages,
        setRequestingPage,
    } = useOrchestratorMessages();

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "initial",
            content: `Mastering the definition of **${label}**? I'm your Knowledge Graph Intelligence Assistant. I can explain how this concept is used across your business, its technical lineage, and who is responsible for it.`,
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [stewardName, setStewardName] = useState(tableMetadata?.steward || "");
    const [isAssigningSteward, setIsAssigningSteward] = useState(false);
    const { employees } = useEmployees();
    const [namesFromTable, setNamesFromTable] = useState<string[]>([]);

    useEffect(() => {
        const fetchNames = async () => {
            const nameColumn = columns?.find(
                (col: any) =>
                    col.column_name?.toLowerCase() === "name" ||
                    col.label?.toLowerCase() === "name" ||
                    col.column_name?.toLowerCase() === "full_name" ||
                    col.label?.toLowerCase() === "full_name"
            );

            if (nameColumn && tableId && companyId) {
                try {
                    const response = await Axios.get("/data/metadata/column-values", {
                        params: {
                            table_id: tableId,
                            column_id: nameColumn.column_id || nameColumn.id,
                            company_id: companyId,
                        },
                    });
                    if (Array.isArray(response.data)) {
                        const names = response.data.map((v: any) => v.value).filter(Boolean);
                        setNamesFromTable(Array.from(new Set(names)) as string[]);
                    }
                } catch (error) {
                    console.error("Error fetching names from table:", error);
                }
            }
        };

        if (columns?.length > 0) {
            fetchNames();
        }
    }, [columns, tableId, companyId]);

    const processedMessageIds = useRef<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Process orchestrator messages
    useEffect(() => {
        if (orchestratorMessages.length > 0) {
            const validMessages = orchestratorMessages.filter(
                (msg) =>
                    msg.success &&
                    (msg.response || msg.message) &&
                    !msg.tool_used &&
                    (msg.current_page === contextPage)
            );

            if (validMessages.length > 0) {
                setIsTyping(false);
                validMessages.forEach((msg) => {
                    const content = msg.response || msg.message || "";
                    const mId = msg.messageId || `bot-${Date.now()}-${Math.random()}`;

                    if (processedMessageIds.current.has(mId)) return;
                    processedMessageIds.current.add(mId);

                    const botMessage: ChatMessage = {
                        id: mId,
                        content: content,
                        sender: "bot",
                        timestamp: new Date(),
                    };

                    setMessages((prev) => {
                        if (prev.find((m) => m.id === botMessage.id)) return prev;
                        return [...prev, botMessage];
                    });
                });
                clearMessages(contextPage);
            }
        }
    }, [orchestratorMessages, clearMessages, contextPage]);

    const handleSendMessage = async (customMessage?: string) => {
        const messageContent = (customMessage || inputMessage).trim();
        if (!messageContent) return;

        setRequestingPage(contextPage);
        localStorage.setItem("currentPage", contextPage);

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            content: messageContent,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        if (!customMessage) setInputMessage("");
        setIsTyping(true);

        try {
            await Axios.post("/data/guides/orchestrator/observe", {
                current_page: contextPage,
                just_opened: false,
                message: messageContent,
                selected_company_id: companyId,
                current_params: tableId,
                context: {
                    knowledge_graph_label: label,
                    table_metadata: tableMetadata,
                    steward: tableMetadata?.steward || "Unassigned",
                }
            });
        } catch (error) {
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    content: "Sorry, I encountered an error. Please try again.",
                    sender: "bot",
                    timestamp: new Date(),
                    type: "error",
                },
            ]);
        }
    };

    const handleFeedback = (messageId: string, type: "positive" | "negative") => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId ? { ...msg, feedback: type } : msg
            )
        );
        toast.success(type === "positive" ? "Feedback captured!" : "Feedback sent to steward for review.");

        Axios.post("/data/guides/feedback", {
            message_id: messageId,
            feedback: type,
            table_id: tableId,
            company_id: companyId,
            steward: tableMetadata?.steward || "Unassigned",
            context: "knowledge_graph"
        }).catch(err => console.error("Feedback error:", err));
    };

    const formatMessageContent = (content: string) => {
        const lines = content.split('\n');
        let html = "";
        let inList = false;
        let inSubList = false;
        let listType: "ordered" | "unordered" | null = null;

        const formatInlineStyles = (text: string) => {
            return text
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-emerald-900">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-mono border border-emerald-100">$1</code>')
                .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-emerald-800/80">$1</em>')
                .replace(/_([^_]+)_/g, '<em class="italic text-emerald-800/80">$1</em>');
        };

        const closeSubList = () => {
            if (inSubList) {
                inSubList = false;
                return "</ul>";
            }
            return "";
        };

        const closeList = () => {
            let result = closeSubList();
            if (inList) {
                inList = false;
                result += listType === "ordered" ? "</ol>" : "</ul>";
                listType = null;
            }
            return result;
        };

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            if (!trimmedLine) {
                html += closeList();
                if (index > 0 && index < lines.length - 1) {
                    html += '<div class="h-2"></div>';
                }
                return;
            }

            // Numbered list
            const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
            if (numberedMatch) {
                html += closeSubList();
                if (!inList || listType !== "ordered") {
                    html += closeList();
                    html += '<ol class="space-y-2 my-3">';
                    inList = true;
                    listType = "ordered";
                }
                const number = numberedMatch[1];
                const text = formatInlineStyles(numberedMatch[2]);
                html += `<li class="flex items-start gap-3">
                    <span class="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">${number}</span>
                    <span class="flex-1 leading-relaxed">${text}</span>
                </li>`;
                return;
            }

            // Bullet points
            const bulletMatch = trimmedLine.match(/^[•\-\*]\s+(.*)$/);
            if (bulletMatch) {
                if (inList && listType === "ordered") {
                    if (!inSubList) {
                        html += '<ul class="space-y-1.5 mt-2 ml-8">';
                        inSubList = true;
                    }
                    const text = formatInlineStyles(bulletMatch[1]);
                    html += `<li class="flex items-start gap-2">
                        <span class="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-emerald-400"></span>
                        <span class="text-sm leading-relaxed text-emerald-800/80 italic">${text}</span>
                    </li>`;
                } else {
                    html += closeSubList();
                    if (!inList || listType !== "unordered") {
                        html += closeList();
                        html += '<ul class="space-y-2 my-3">';
                        inList = true;
                        listType = "unordered";
                    }
                    const text = formatInlineStyles(bulletMatch[1]);
                    html += `<li class="flex items-start gap-2">
                        <span class="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-emerald-500"></span>
                        <span class="flex-1 leading-relaxed">${text}</span>
                    </li>`;
                }
                return;
            }

            // Regular paragraph
            html += closeList();
            const formattedText = formatInlineStyles(trimmedLine);
            html += `<p class="leading-relaxed my-1">${formattedText}</p>`;
        });

        html += closeList();
        return html;
    };

    return (
        <Card className="flex flex-col h-full max-h-[800px] bg-white/40 backdrop-blur-xl border-white/60 shadow-2xl rounded-[2.5rem] overflow-hidden relative">
            {/* Glossy Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 relative overflow-hidden rounded-t-[2.5rem]">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm tracking-tight">Knowledge Graph Intel Assistant</h3>
                            <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConnected ? "bg-emerald-400" : "bg-red-400")} />
                                <span className="text-[10px] text-emerald-100 font-medium uppercase tracking-wider">
                                    {isConnected ? "Knowledge Graph Context Active" : "Disconnected"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Glossary Context Bar */}
            <div className="px-5 py-2.5 bg-emerald-50/50 border-b border-emerald-100/50 flex items-center justify-between text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    <span>Term: {label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" />
                    {isAssigningSteward ? (
                        <div className="flex items-center gap-1">
                            <Select
                                value={stewardName}
                                onValueChange={(value) => {
                                    setStewardName(value);
                                    setIsAssigningSteward(false);
                                }}
                                open={isAssigningSteward}
                                onOpenChange={setIsAssigningSteward}
                            >
                                <SelectTrigger className="h-5 py-0 px-1 text-[8px] w-32 bg-white border-emerald-200 focus:ring-indigo-300">
                                    <SelectValue placeholder="Select Steward..." />
                                </SelectTrigger>
                                <SelectContent className="min-w-[150px] bg-white">
                                    <div className="px-2 py-1.5 text-[8px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Team Members</div>
                                    {employees?.map((emp) => {
                                        const name = emp.full_name || `${emp.first_name} ${emp.last_name}`;
                                        return (
                                            <SelectItem key={`emp-${emp.id}`} value={name} className="text-[10px]">
                                                {name}
                                            </SelectItem>
                                        );
                                    })}

                                    {namesFromTable.length > 0 && (
                                        <>
                                            <div className="px-2 py-1.5 text-[8px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 mt-1">Table Records</div>
                                            {namesFromTable.map((name, idx) => (
                                                <SelectItem key={`table-${idx}`} value={name} className="text-[10px]">
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}

                                    {(!employees || employees.length === 0) && namesFromTable.length === 0 && (
                                        <div className="p-2 text-[8px] text-gray-400">No people found</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsAssigningSteward(true)}>
                            <span>Steward: {stewardName || "Unassigned"}</span>
                            <UserPlus className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-5 relative">
                <div className="space-y-6">
                    <AnimatePresence initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={cn("flex flex-col", message.sender === "user" ? "items-end" : "items-start")}
                            >
                                <div className={cn(
                                    "flex gap-3 max-w-[90%]",
                                    message.sender === "user" ? "flex-row-reverse" : "flex-row"
                                )}>
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border shadow-sm",
                                        message.sender === "user"
                                            ? "bg-emerald-600 border-emerald-500 text-white"
                                            : "bg-white border-gray-200 text-emerald-600"
                                    )}>
                                        {message.sender === "user" ? <User className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className={cn(
                                            "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                            message.sender === "user"
                                                ? "bg-emerald-600 text-white"
                                                : "bg-white border border-gray-100 text-gray-800"
                                        )}>
                                            <div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                                        </div>

                                        {message.sender === "bot" && message.id !== "initial" && (
                                            <div className="flex items-center gap-1 ml-auto">
                                                <button
                                                    onClick={() => handleFeedback(message.id, "positive")}
                                                    className={cn(
                                                        "p-1.5 rounded-md transition-all",
                                                        message.feedback === "positive" ? "bg-emerald-100 text-emerald-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                                    )}
                                                >
                                                    <ThumbsUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleFeedback(message.id, "negative")}
                                                    className={cn(
                                                        "p-1.5 rounded-md transition-all",
                                                        message.feedback === "negative" ? "bg-rose-100 text-rose-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                                    )}
                                                >
                                                    <ThumbsDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center border border-emerald-200">
                                <Brain className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                                <div className="flex gap-1">
                                    <motion.div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                                    <motion.div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                                    <motion.div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                                </div>
                                <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Consulting Knowledge Graph...</span>
                            </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Suggested Options Row */}
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 min-w-max">
                    {[
                        { label: "Business Meaning", action: "Tell me about the business meaning of this term" },
                        { label: "Data Lineage", action: "Show me the data lineage for this term" },
                        { label: "Ownership", action: "Who is the business owner for this?" }
                    ].map((suggestion, idx) => (
                        <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendMessage(suggestion.action)}
                            className="bg-white/80 border-emerald-100 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider px-4 transition-all"
                        >
                            {suggestion.label}
                        </Button>
                    ))}
                    {initialSuggestions?.map((suggestion, idx) => (
                        <Button
                            key={`init-${idx}`}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendMessage(suggestion.action)}
                            className="bg-white/80 border-emerald-100 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-wider px-4 transition-all"
                        >
                            {suggestion.description || suggestion.action}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Modern Input Bar */}
            <div className="p-5 bg-white border-t border-gray-100">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative flex gap-2 items-center bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
                        <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                            placeholder="Ask about definition, intent, or usage..."
                            className="border-none bg-transparent focus-visible:ring-0 text-sm placeholder:text-gray-400"
                        />
                        <Button
                            onClick={() => handleSendMessage()}
                            disabled={!inputMessage.trim() || isTyping}
                            size="icon"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-500/20"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
