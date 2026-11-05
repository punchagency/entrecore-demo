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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

interface UnifiedRecordChatProps {
  tableMetadata: any;
  columns: any[];
  companyId: string;
  tableId: string;
  contextPage: string;
  onClose?: () => void;
  initialSuggestions?: any[];
}

export function UnifiedRecordChat({
  tableMetadata,
  columns,
  companyId,
  tableId,
  contextPage,
  onClose,
  initialSuggestions,
}: UnifiedRecordChatProps) {
  const { isConnected, reconnect } = useSocketIO();
  const {
    messages: orchestratorMessages,
    clearMessages,
    setRequestingPage,
  } = useOrchestratorMessages();

  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: `Hi! I'm your Entrecore Business Assistant. I've analyzed **${tableMetadata?.table_name || "this record"}** and I'm ready to help you understand its business meaning, lineage, and ownership. What would you like to know?`,
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [stewardName, setStewardName] = useState(tableMetadata?.steward || "");
  const [isAssigningSteward, setIsAssigningSteward] = useState(false);
  const { employees } = useEmployees();
  const [namesFromTable, setNamesFromTable] = useState<string[]>([]);

  useEffect(() => {
    const fetchNames = async () => {
      const nameColumn = columns?.find((col: any) => {
        const colName = (col.column_name || col.label || "").toLowerCase();
        return (
          colName === "name" ||
          colName === "full_name" ||
          colName === "founder_name" ||
          colName === "person_name" ||
          (colName.includes("name") && !colName.includes("company") && !colName.includes("table"))
        );
      });

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
            const names = response.data.map((v: any) => v.value || v).filter(Boolean);
            setNamesFromTable(Array.from(new Set(names)) as string[]);
          } else if (response.data && Array.isArray(response.data.items)) {
            const names = response.data.items.map((v: any) => v.value || v).filter(Boolean);
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

  useEffect(() => {
    if (tableMetadata?.steward) {
      setStewardName(tableMetadata.steward);
    }
  }, [tableMetadata?.steward]);

  const [initialBotMessage, setInitialBotMessage] = useState<string | undefined>(undefined);
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
          msg.current_page === contextPage
      );

      if (validMessages.length > 0) {
        setIsTyping(false);
        validMessages.forEach((msg) => {
          const content = msg.response || msg.message || "";
          const mId = msg.messageId || `bot-${Date.now()}-${Math.random()}`;

          if (processedMessageIds.current.has(mId)) return;
          processedMessageIds.current.add(mId);

          // Mock sources for demonstration
          const mockSources: any[] = [];
          if (
            content.toLowerCase().includes("owner") ||
            content.toLowerCase().includes("steward")
          ) {
            mockSources.push({ type: "governance", label: "Data Stewardship Policy" });
          }
          if (columns && columns.length > 0) {
            mockSources.push({ type: "field", label: columns[0].column_name });
          }

          const botMessage: ChatMessage = {
            id: mId,
            content: content,
            sender: "bot",
            timestamp: new Date(),
            sources: mockSources,
          };

          setMessages((prev) => {
            if (prev.find((m) => m.id === botMessage.id)) return prev;
            return [...prev, botMessage];
          });
        });
        clearMessages(contextPage);
      }
    }
  }, [orchestratorMessages, clearMessages, contextPage, columns]);

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
          table_metadata: tableMetadata,
          column_count: columns?.length || 0,
          steward: tableMetadata?.steward || "Unassigned",
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
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
      prev.map((msg) => (msg.id === messageId ? { ...msg, feedback: type } : msg))
    );

    // In production, send this to the backend
    toast.success(
      type === "positive" ? "Feedback captured!" : "Feedback sent to steward for review."
    );

    Axios.post("/data/guides/feedback", {
      message_id: messageId,
      feedback: type,
      table_id: tableId,
      company_id: companyId,
      steward: tableMetadata?.steward || "Unassigned",
    }).catch((err) => console.error("Feedback error:", err));
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  return (
    <Card className="flex flex-col h-full max-h-[800px] bg-white/40 backdrop-blur-xl border-white/60 shadow-2xl rounded-[2.5rem] overflow-hidden relative">
      {/* Premium Header */}
      <div className="p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 relative overflow-hidden rounded-t-[2.5rem]">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm tracking-tight">
                Business Intel Assistant
              </h3>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    isConnected ? "bg-emerald-400" : "bg-red-400"
                  )}
                />
                <span className="text-[10px] text-indigo-100 font-medium uppercase tracking-wider">
                  {isConnected ? "Context Grounded" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Record Context Bar */}
      <div className="px-5 py-2.5 bg-indigo-50/50 border-b border-indigo-100/50 flex items-center justify-between text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Database className="w-3 h-3" />
          <span>{tableMetadata?.table_name || tableMetadata?.name || "Record"}</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3" />
          {isAssigningSteward ? (
            <div className="flex items-center gap-1">
              <Select
                value={stewardName}
                onValueChange={async (value) => {
                  setStewardName(value);
                  setIsAssigningSteward(false);
                  try {
                    await Axios.patch(`/data/metadata/tables/${tableId}`, {
                      steward: value,
                      company_id: companyId,
                    });
                    toast.success(`Steward assigned: ${value}`);
                  } catch (error) {
                    console.error("Error updating steward:", error);
                    toast.error("Failed to update steward");
                  }
                }}
                open={isAssigningSteward}
                onOpenChange={setIsAssigningSteward}
              >
                <SelectTrigger className="h-5 py-0 px-1 text-[8px] w-32 bg-white border-indigo-200 focus:ring-indigo-300">
                  <SelectValue placeholder="Select Steward..." />
                </SelectTrigger>
                <SelectContent className="min-w-[150px] bg-white">
                  <div className="px-2 py-1.5 text-[8px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Team Members
                  </div>
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
                      <div className="px-2 py-1.5 text-[8px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 mt-1">
                        Table Records
                      </div>
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
            <div
              className="flex items-center gap-1.5 group cursor-pointer"
              onClick={() => setIsAssigningSteward(true)}
            >
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
                className={cn(
                  "flex flex-col",
                  message.sender === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "flex gap-3 max-w-[90%]",
                    message.sender === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center border shadow-sm",
                      message.sender === "user"
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-white border-gray-200 text-indigo-600"
                    )}
                  >
                    {message.sender === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                        message.sender === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-gray-100 text-gray-800"
                      )}
                    >
                      {message.sender === "user" ? (
                        <div className="text-white whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <div className="prose prose-sm max-w-none text-gray-800">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="pl-5 space-y-2 my-2 list-disc marker:text-indigo-500">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="pl-5 space-y-2 my-2 list-decimal marker:text-indigo-600 marker:font-bold">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="pl-1 leading-relaxed">{children}</li>
                              ),

                              h1: ({ children }) => (
                                <h1 className="text-lg font-bold text-indigo-900 mb-2 mt-4">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-base font-bold text-indigo-800 mb-2 mt-3">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-bold text-indigo-800 mb-1 mt-2">
                                  {children}
                                </h3>
                              ),

                              strong: ({ children }) => (
                                <strong className="font-bold text-indigo-900">{children}</strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic text-indigo-800/80">{children}</em>
                              ),
                              code: ({ children }) => (
                                <code className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-mono border border-indigo-100">
                                  {children}
                                </code>
                              ),

                              // Table styling
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-4 rounded-lg border border-indigo-100 shadow-sm">
                                  <table className="min-w-full divide-y divide-indigo-100/50 text-sm">
                                    {children}
                                  </table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-indigo-50/50">{children}</thead>
                              ),
                              tbody: ({ children }) => (
                                <tbody className="bg-white divide-y divide-indigo-50">
                                  {children}
                                </tbody>
                              ),
                              tr: ({ children }) => (
                                <tr className="hover:bg-indigo-50/30 transition-colors">
                                  {children}
                                </tr>
                              ),
                              th: ({ children }) => (
                                <th className="px-3 py-2 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                  {children}
                                </td>
                              ),
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300 underline-offset-2"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-indigo-200 pl-4 italic text-gray-600 my-2">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Bot specific features: Traceability and Feedback */}
                    {message.sender === "bot" && (
                      <div className="flex items-center gap-3 mt-1 px-1">
                        {message.sources && message.sources.length > 0 && (
                          <button
                            onClick={() => toggleSources(message.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-wider"
                          >
                            <Info className="w-3 h-3" />
                            {expandedSources[message.id] ? "Hide Sources" : "View Sources"}
                            {expandedSources[message.id] ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={() => handleFeedback(message.id, "positive")}
                            className={cn(
                              "p-1.5 rounded-md transition-all",
                              message.feedback === "positive"
                                ? "bg-emerald-100 text-emerald-600"
                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            )}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(message.id, "negative")}
                            className={cn(
                              "p-1.5 rounded-md transition-all",
                              message.feedback === "negative"
                                ? "bg-rose-100 text-rose-600"
                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            )}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Traceability Panel */}
                    <AnimatePresence>
                      {message.sender === "bot" &&
                        expandedSources[message.id] &&
                        message.sources && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-3 mt-2 space-y-2">
                              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">
                                Technical & Business Context
                              </div>
                              {message.sources.map((source, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-[11px] text-indigo-700 font-medium"
                                >
                                  {source.type === "field" && (
                                    <Database className="w-3 h-3 opacity-60" />
                                  )}
                                  {source.type === "asset" && (
                                    <LinkIcon className="w-3 h-3 opacity-60" />
                                  )}
                                  {source.type === "governance" && (
                                    <ShieldCheck className="w-3 h-3 opacity-60" />
                                  )}
                                  <span className="bg-white/80 px-2 py-0.5 rounded border border-indigo-100/50">
                                    {source.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center border border-indigo-200">
                <Brain className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <motion.div
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  />
                </div>
                <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest">
                  Synthesizing...
                </span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Suggested Options Row */}
      <div
        className={`px-5 py-3 bg-gray-50/50 border-t border-gray-100 overflow-x-auto no-scrollbar`}
      >
        <div className="flex gap-2 min-w-max">
          {[
            {
              label: "Business Meaning",
              action: "Tell me about the business meaning of this record",
            },
            { label: "Data Lineage", action: "Show me the data lineage for this record" },
            { label: "Ownership", action: "Who is responsible for this data?" },
          ].map((suggestion, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => handleSendMessage(suggestion.action)}
              className="bg-white/80 border-indigo-100 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 rounded-full text-[10px] font-bold uppercase tracking-wider px-4 transition-all"
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
              className="bg-white/80 border-indigo-100 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 rounded-full text-[10px] font-bold uppercase tracking-wider px-4 transition-all"
            >
              {suggestion.description || suggestion.action}
            </Button>
          ))}
        </div>
      </div>

      {/* Modern Input Bar */}
      <div className="p-5 bg-white border-t border-gray-100">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex gap-2 items-center bg-gray-50 p-1.5 rounded-xl border border-gray-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask about meaning, lineage, or ownership..."
              className="border-none bg-transparent focus-visible:ring-0 text-sm placeholder:text-gray-400"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isTyping}
              size="icon"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/20"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center font-medium uppercase tracking-widest">
          Analytic context active for {tableMetadata?.table_name || "Record"}
        </p>
      </div>
    </Card>
  );
}
