"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  X as XIcon,
  Zap,
  Sparkles,
  Wifi,
  WifiOff,
  Brain,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useSocketIO } from "@/contexts/socketio-context";
import { useOrchestratorMessages } from "@/app/store/orchestratorStore";
import { Axios } from "@/app/config/axios";
import { cn } from "@/lib/utils";
import { formatMessageContent } from "../utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "suggestion" | "error" | "text";
  suggestion?: {
    action: string;
    description: string;
  };
}

interface Suggestion {
  id: string;
  action: string;
  description: string;
  priority?: string;
}

interface FloatingChatWidgetProps {
  isOpen?: boolean;
  onToggle?: () => void;
  initialSuggestions?: Suggestion[];
  contextPage?: string;
  selectedCompanyId?: string | null;
  currentParams?: string | null;
  variant?: "floating" | "embedded";
  initialBotMessage?: string;
  isJustOpened?: boolean;
}

export function FloatingChatWidget({
  isOpen: externalIsOpen,
  onToggle,
  initialSuggestions,
  contextPage = "coreos",
  selectedCompanyId,
  currentParams,
  variant = "floating",
  initialBotMessage,
  isJustOpened = true,
}: FloatingChatWidgetProps) {
  const { isConnected, reconnect } = useSocketIO();
  const {
    messages: orchestratorMessages,
    clearMessages,
    setRequestingPage,
    requestingPage,
  } = useOrchestratorMessages();

  const [isOpen, setIsOpen] = useState(externalIsOpen || variant === "embedded");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content:
        initialBotMessage ||
        "Hi! I'm your CoreOS assistant. I can help you optimize your workflow and suggest improvements. What would you like to know?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasProcessedInitialSuggestions, setHasProcessedInitialSuggestions] = useState(false);
  const [hasNewSuggestions, setHasNewSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  const [botMessageIds, setBotMessageIds] = useState<string[]>([]);

  // /////This enables reconnect from dead socket connections
  const lastChangeRef = useRef(Date.now());
  const [justOpened, setJustOpened] = useState(isJustOpened);

  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        if (Date.now() - lastChangeRef.current >= 15000) {
          reconnect();
          console.log("State idle for 15s");
          lastChangeRef.current = Date.now(); // reset
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isTyping]);
  ///////////////////////

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsOpen(externalIsOpen);
    } else if (variant === "embedded") {
      setIsOpen(true);
    }
  }, [externalIsOpen, variant]);
  // Process orchestrator messages when they arrive (event-driven)
  useEffect(() => {
    if (orchestratorMessages.length > 0) {
      // Filter for valid success messages with content
      //Also filter out messageId already in the system

      const validMessages = orchestratorMessages.filter(
        (msg) =>
          msg.success &&
          (msg.response || msg.message) &&
          !botMessageIds.includes(msg.messageId ?? "") &&
          !msg.tool_used // Filter out tool outputs
      );

      if (validMessages.length > 0) {
        setIsTyping(false);

        // Combine all message contents into one single message
        const messagesContent = validMessages.map((msg) => msg.response || msg.message);
        const messageIds: string[] = validMessages
          .filter((msg) => typeof msg.messageId === "string")
          .map((msg) => String(msg.messageId));
        const uniqueContent = Array.from(new Set(messagesContent));
        const combinedContent = uniqueContent.join("\n\n---\n\n");

        // Create a unique ID for this batch
        // Use the first message's ID properties or fallback to timestamp
        const firstMsg = validMessages[0];
        const batchId =
          firstMsg.conversation_id ||
          firstMsg.checkpoint_id ||
          firstMsg.id ||
          `batch-${Date.now()}`;

        // Check if we've already processed this batch ID
        if (!processedMessageIds.current.has(batchId)) {
          const suggestionMessage: ChatMessage = {
            id: batchId,
            content: combinedContent,
            sender: "bot",
            timestamp: new Date(),
            type: "suggestion",
            suggestion: {
              action: firstMsg.tool_used || firstMsg.action || firstMsg.type || "general",
              description: combinedContent,
            },
          };

          // Mark as processed immediately
          processedMessageIds.current.add(batchId);

          setMessages((prev) => {
            // Double-check for content duplicates in current state
            const isDuplicateContent = prev.some(
              (msg) => msg.sender === "bot" && msg.content === combinedContent
            );

            if (isDuplicateContent) {
              return prev;
            }

            return [...prev, suggestionMessage];
          });

          setBotMessageIds((prev) => [...prev, ...messageIds]);

          if (isOpen) {
            setHasNewSuggestions(true);
          }
          // Auto-open on new suggestions removed to keep assistant minimized
          // if (!isOpen) {
          //   setIsOpen(true);
          // }
        }
      }

      // Clear processed messages
      clearMessages();
    }
  }, [orchestratorMessages, clearMessages, isOpen, contextPage, requestingPage]);
  useEffect(() => {
    if (initialSuggestions && initialSuggestions.length > 0 && !hasProcessedInitialSuggestions) {
      const suggestionMessages = initialSuggestions.map((suggestion) => ({
        id: suggestion.id || Date.now().toString() + Math.random(),
        content: suggestion.description,
        sender: "bot" as const,
        timestamp: new Date(),
        type: "suggestion" as const,
        suggestion: {
          action: suggestion.action,
          description: suggestion.description,
        },
      }));

      const uniqueSuggestions = Array.from(
        new Map(suggestionMessages.map((item) => [item.content, item])).values()
      );

      setMessages((prev) => [...prev, ...uniqueSuggestions]);

      // Auto-open widget has been removed to keep assistant minimized by default
      // setIsOpen(true);
      setHasProcessedInitialSuggestions(true);
    }
  }, [initialSuggestions, hasProcessedInitialSuggestions]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageContent = inputMessage.trim();
    console.log("=== USER SENDING MESSAGE ===");
    console.log("Message content:", messageContent);
    console.log("Socket.IO connected:", isConnected);
    console.log("Setting requesting page to:", contextPage);

    // Set the requesting page so responses are filtered to this page
    setRequestingPage(contextPage || "coreos");

    // Create user message immediately
    const userMessage: ChatMessage = {
      id: "user-" + Date.now(),
      content: messageContent,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    // Update all state immediately using flushSync for immediate UI update
    import("react-dom").then(({ flushSync }) => {
      flushSync(() => {
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage("");
        setIsTyping(true); // Start typing indicator immediately
        lastChangeRef.current = Date.now();
      });
    });
    console.log(messages, "messages");
    try {
      console.log("=== CALLING OBSERVE API ===");
      console.log("API endpoint: /data/guides/orchestrator/observe");
      console.log("Payload:", {
        current_page: contextPage || "coreos",
        just_opened: justOpened,
        message: messageContent,
        selected_company_id: selectedCompanyId,
        current_params: currentParams,
      });

      // Send message to orchestrator via the same observe API used on page load
      const response = await Axios.post("/data/guides/orchestrator/observe", {
        current_page: contextPage || "coreos",
        just_opened: justOpened,
        message: messageContent,
        selected_company_id: selectedCompanyId,
        current_params: currentParams,
      });

      setJustOpened(false); // Reset justOpened after first message
      localStorage.setItem("currentPage", contextPage);

      console.log("=== OBSERVE API RESPONSE ===");
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);
      console.log("Message sent successfully to orchestrator:", messageContent);

      // The response will come through Socket.IO as agent_response events
      // No need to handle the response here as it will be processed by the existing event handler
      // Keep typing indicator active until WebSocket response arrives
    } catch (error) {
      console.error("=== OBSERVE API ERROR ===");
      console.error("Error sending message to orchestrator:", error);

      // Type-safe error handling
      const axiosError = error as any;
      console.error("Error details:", axiosError.response?.data || axiosError.message);

      setIsTyping(false);

      // Show error message to user
      const errorMessage: ChatMessage = {
        id: "error-" + Date.now(),
        content: `Failed to send message: ${axiosError.response?.data?.message || axiosError.message || "Unknown error"}. Please check your connection and try again.`,
        sender: "bot",
        timestamp: new Date(),
        type: "error",
      };

      setMessages((prev) => [...prev, errorMessage]);
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

  return (
    <>
      {/* Floating Chat Button - Only show in floating mode */}
      {variant === "floating" && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                className="relative"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <Button
                  onClick={() => {
                    setHasNewSuggestions(false);
                    handleToggle();
                  }}
                  className={cn(
                    "w-16 h-16 rounded-full relative overflow-hidden",
                    "bg-gradient-to-br from-blue-600 to-purple-700",
                    "shadow-2xl shadow-blue-500/25",
                    "hover:shadow-3xl hover:shadow-blue-500/40",
                    "border-2 border-white/20 backdrop-blur-sm",
                    "transition-all duration-300"
                  )}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{
                      x: ["-100%", "200%"],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <MessageCircle className="w-7 h-7 text-white relative z-10" />
                  <Sparkles className="w-4 h-4 text-yellow-300 absolute -top-1 -right-1" />
                </Button>
                <AnimatePresence>
                  {hasNewSuggestions && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="absolute -top-2 -right-2"
                    >
                      <Badge className="bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs px-2 py-1 min-w-[20px] h-[20px] rounded-full flex items-center justify-center shadow-lg">
                        <Zap className="w-3 h-3" />
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {(isOpen || variant === "embedded") && (
          <motion.div
            className={cn(
              variant === "floating"
                ? "fixed bottom-6 right-6 z-50"
                : "w-full h-[600px] relative z-0 mt-4"
            )}
            initial={variant === "floating" ? { scale: 0.8, opacity: 0, y: 20 } : { opacity: 0 }}
            animate={variant === "floating" ? { scale: 1, opacity: 1, y: 0 } : { opacity: 1 }}
            exit={variant === "floating" ? { scale: 0.8, opacity: 0, y: 20 } : { opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <Card
              className={cn(
                "flex flex-col overflow-hidden",
                "bg-white/80 dark:bg-gray-900/80",
                "backdrop-blur-xl",
                "border border-white/20 dark:border-gray-700/50",
                variant === "floating"
                  ? "w-[30vw] h-[60vh] min-w-[400px] min-h-[500px] shadow-2xl shadow-blue-500/10 dark:shadow-blue-900/20"
                  : "w-full h-full shadow-sm rounded-lg",
                "relative",
                "py-0"
              )}
            >
              {/* Gradient Background Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10" />

              {/* Header */}
              <motion.div
                className={cn(
                  "flex items-center justify-between p-4",
                  "bg-gradient-to-r from-blue-600 to-purple-700",
                  "border-b border-white/20",
                  "relative overflow-hidden"
                )}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div className="flex items-center space-x-3 relative z-10">
                  <motion.div
                    animate={{
                      y: [0, -2, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Bot className="w-6 h-6 text-white" />
                  </motion.div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">CoreOS Assistant</span>
                    <div className="flex items-center space-x-1">
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {isConnected ? (
                          <Wifi className="w-3 h-3 text-green-300" />
                        ) : (
                          <WifiOff className="w-3 h-3 text-red-300" />
                        )}
                      </motion.div>
                      <span className="text-xs text-blue-100">
                        {isConnected ? "Connected" : "Connecting..."}
                      </span>
                    </div>
                  </div>
                </div>
                {variant === "floating" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggle}
                    className="text-white hover:bg-white/20 p-1 h-8 w-8 relative z-10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 relative z-10">
                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.3,
                          ease: "easeOut",
                        }}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex space-x-2 max-w-[100%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                        >
                          {/* Avatar */}
                          <motion.div
                            className={cn(
                              "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                              "border-2 border-white/20 shadow-lg",
                              message.sender === "user"
                                ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
                            )}
                            whileHover={{ scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            {message.sender === "user" ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </motion.div>

                          {/* Message Content */}
                          <div
                            className={`flex flex-col ${message.sender === "user" ? "items-end" : "items-start"}`}
                          >
                            <motion.div
                              className={cn(
                                "px-4 py-3 rounded-2xl",
                                "backdrop-blur-sm",
                                "shadow-lg",
                                message.sender === "user"
                                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                                  : cn(
                                      "bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100",
                                      "border border-gray-200/50 dark:border-gray-700/50"
                                    )
                              )}
                              whileHover={{ y: -2 }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            >
                              {message.sender === "user" ? (
                                <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">
                                  {message.content}
                                </div>
                              ) : (
                                <div className="text-sm leading-relaxed max-w-none text-gray-800 dark:text-gray-100">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      p: ({ children }) => (
                                        <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="pl-5 space-y-2 my-2 list-disc marker:text-blue-500">
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="pl-5 space-y-2 my-2 list-decimal marker:text-blue-600 marker:font-bold">
                                          {children}
                                        </ol>
                                      ),
                                      li: ({ children }) => (
                                        <li className="pl-1 leading-relaxed">{children}</li>
                                      ),

                                      h1: ({ children }) => (
                                        <h1 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2 mt-4">
                                          {children}
                                        </h1>
                                      ),
                                      h2: ({ children }) => (
                                        <h2 className="text-base font-bold text-blue-800 dark:text-blue-200 mb-2 mt-3 block">
                                          {children}
                                        </h2>
                                      ),
                                      h3: ({ children }) => (
                                        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-1 mt-2 block">
                                          {children}
                                        </h3>
                                      ),

                                      // Force bold with ! important to override any potential inherited styles, and high contrast color
                                      strong: ({ children }) => (
                                        <strong className="!font-bold text-blue-800 dark:text-blue-300">
                                          {children}
                                        </strong>
                                      ),
                                      em: ({ children }) => (
                                        <em className="italic text-gray-700 dark:text-gray-300">
                                          {children}
                                        </em>
                                      ),
                                      code: ({ children }) => (
                                        <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-blue-300 text-xs font-mono border border-blue-100 dark:border-gray-700">
                                          {children}
                                        </code>
                                      ),

                                      // Added proper styling for horizontal rules (separators)
                                      hr: () => (
                                        <hr className="my-4 border-t border-gray-200 dark:border-gray-700/50" />
                                      ),

                                      // Table styling
                                      table: ({ children }) => (
                                        <div className="overflow-x-auto my-4 rounded-lg border border-blue-100 dark:border-gray-700 shadow-sm">
                                          <table className="min-w-full divide-y divide-blue-100/50 dark:divide-gray-700 text-sm">
                                            {children}
                                          </table>
                                        </div>
                                      ),
                                      thead: ({ children }) => (
                                        <thead className="bg-blue-50/50 dark:bg-gray-800">
                                          {children}
                                        </thead>
                                      ),
                                      tbody: ({ children }) => (
                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-blue-50 dark:divide-gray-800">
                                          {children}
                                        </tbody>
                                      ),
                                      tr: ({ children }) => (
                                        <tr className="hover:bg-blue-50/30 dark:hover:bg-gray-800/50 transition-colors">
                                          {children}
                                        </tr>
                                      ),
                                      th: ({ children }) => (
                                        <th className="px-3 py-2 text-left text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                                          {children}
                                        </th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                          {children}
                                        </td>
                                      ),
                                      a: ({ children, href }) => (
                                        <a
                                          href={href}
                                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 underline-offset-2 font-medium"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {children}
                                        </a>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-blue-300 dark:border-blue-600 pl-4 italic text-gray-600 dark:text-gray-400 my-3 bg-gray-50 dark:bg-gray-800/30 py-1 rounded-r">
                                          {children}
                                        </blockquote>
                                      ),
                                    }}
                                  >
                                    {formatMessageContent(message.content)}
                                  </ReactMarkdown>
                                </div>
                              )}

                              {message.type === "suggestion" && (
                                <Lightbulb className="w-4 h-4 text-yellow-400 mt-2" />
                              )}
                            </motion.div>
                            {/* Suggestion Actions
                            {message.type === "suggestion" && message.suggestion && (
                              <motion.div
                                className="flex space-x-2 mt-3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                              >
                                <Button
                                  size="sm"
                                  onClick={() => handleSuggestionResponse(true, message.suggestion)}
                                  className={cn(
                                    "bg-gradient-to-r from-green-500 to-green-600",
                                    "hover:from-green-600 hover:to-green-700",
                                    "text-white text-xs px-4 py-2 h-8",
                                    "shadow-lg shadow-green-500/25",
                                    "hover:shadow-green-500/40",
                                    "transition-all duration-200"
                                  )}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleSuggestionResponse(false, message.suggestion)
                                  }
                                  className={cn(
                                    "text-xs px-4 py-2 h-8",
                                    "border-gray-300 dark:border-gray-600",
                                    "hover:bg-gray-50 dark:hover:bg-gray-700",
                                    "transition-all duration-200"
                                  )}
                                >
                                  <XIcon className="w-3 h-3 mr-1" />
                                  Decline
                                </Button>
                              </motion.div>
                            )} */}
                            {/* Timestamp */}
                            <motion.span
                              className="text-xs text-gray-500 dark:text-gray-400 mt-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              {formatTime(message.timestamp)}
                            </motion.span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing Indicator */}
                  {isTyping && (
                    <motion.div
                      className="flex justify-start"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex space-x-2 max-w-[100%]">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-2 border-white/20 shadow-lg flex items-center justify-center">
                          <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <motion.div
                          className="bg-white/90 dark:bg-gray-800/90 rounded-2xl px-4 py-3 shadow-lg border border-gray-200/50 dark:border-gray-700/50"
                          animate={{
                            scale: [1, 1.02, 1],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
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
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Input */}
              <motion.div
                className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 relative z-10"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex space-x-3">
                  <motion.div
                    className="flex-1 relative"
                    whileFocus={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Send message to orchestrator..."
                      className={cn(
                        "w-full text-sm",
                        "bg-white/80 dark:bg-gray-800/80",
                        "border border-gray-300/50 dark:border-gray-600/50",
                        "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                        "backdrop-blur-sm",
                        "rounded-xl",
                        "transition-all duration-200",
                        "pr-12"
                      )}
                      disabled={isTyping}
                    />
                    {inputMessage && (
                      <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setInputMessage("")}
                      >
                        <XIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </motion.button>
                    )}
                  </motion.div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    size="sm"
                    className={cn(
                      "bg-gradient-to-r from-blue-500 to-purple-600",
                      "hover:from-blue-600 hover:to-purple-700",
                      "text-white",
                      "shadow-lg shadow-blue-500/25",
                      "hover:shadow-blue-500/40",
                      "rounded-xl",
                      "w-9 h-9",
                      "transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <motion.div
                      animate={{
                        rotate: inputMessage.trim() ? [0, 10, -10, 0] : 0,
                        scale: inputMessage.trim() ? [1, 1.1, 1] : 1,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Send className="w-5 h-5" />
                    </motion.div>
                  </Button>
                </div>
              </motion.div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
