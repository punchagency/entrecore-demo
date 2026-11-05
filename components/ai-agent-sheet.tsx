"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Brain,
  Database,
  FileText,
  MessageSquare,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  BarChart,
  Shield,
  Users,
  DollarSign,
  Building,
  TrendingUp,
  Activity,
  Eye,
} from "lucide-react";
import { useOrchestratorMessages } from "@/app/store/orchestratorStore";
import { Axios } from "@/app/config/axios";

interface ActiveAgent {
  id: string;
  name: string;
  status: "active" | "working" | "completed";
  dataset: string;
  lastAction: string;
  progress?: number;
}

interface Dataset {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: Date;
  type?: "text" | "insight" | "action";
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

interface AIAgentSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const activeAgents: ActiveAgent[] = [
  {
    id: "compliance-officer",
    name: "Compliance Officer",
    status: "active",
    dataset: "Financial Data",
    lastAction: "Reviewing Q3 financial statements",
    progress: 75,
  },
  {
    id: "financial-auditor",
    name: "Financial Auditor",
    status: "working",
    dataset: "Company Documents",
    lastAction: "Analyzing contract compliance",
    progress: 45,
  },
  {
    id: "document-processor",
    name: "Document Processor",
    status: "completed",
    dataset: "Legal Documents",
    lastAction: "Extracted key terms from 23 contracts",
  },
];

const datasets: Dataset[] = [
  { id: "financial", name: "Financial Data", count: 45, icon: <DollarSign className="w-4 h-4" /> },
  { id: "staff", name: "Staff Records", count: 23, icon: <Users className="w-4 h-4" /> },
  { id: "documents", name: "Company Documents", count: 67, icon: <FileText className="w-4 h-4" /> },
  { id: "legal", name: "Legal Documents", count: 34, icon: <Building className="w-4 h-4" /> },
  { id: "catalog", name: "Data Catalog", count: 89, icon: <Database className="w-4 h-4" /> },
];

const quickActions: QuickAction[] = [
  {
    id: "analyze",
    label: "Analyze Dataset",
    description: "Get AI insights from your data",
    icon: <BarChart className="w-4 h-4" />,
    category: "Analysis",
  },
  {
    id: "summarize",
    label: "Generate Summary",
    description: "Create executive summary",
    icon: <FileText className="w-4 h-4" />,
    category: "Reports",
  },
  {
    id: "compliance",
    label: "Compliance Check",
    description: "Verify regulatory compliance",
    icon: <Shield className="w-4 h-4" />,
    category: "Governance",
  },
  {
    id: "anomalies",
    label: "Find Anomalies",
    description: "Detect data inconsistencies",
    icon: <AlertCircle className="w-4 h-4" />,
    category: "Quality",
  },
  {
    id: "trends",
    label: "Trend Analysis",
    description: "Identify patterns and trends",
    icon: <TrendingUp className="w-4 h-4" />,
    category: "Analysis",
  },
  {
    id: "cross-reference",
    label: "Cross-Reference",
    description: "Link related data points",
    icon: <Database className="w-4 h-4" />,
    category: "Integration",
  },
];

export function AIAgentSheet({ open, onOpenChange, children }: AIAgentSheetProps) {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "ai",
      content: "Hello! I'm your AI assistant. How can I help you analyze your data today?",
      timestamp: new Date(),
      type: "text",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedDataset, setSelectedDataset] = useState<string>("financial");

  const {
    messages: orchestratorMessages,
    clearMessages,
    setRequestingPage,
  } = useOrchestratorMessages() as {
    messages: any[],
    clearMessages: (page?: string) => void,
    setRequestingPage: (page: string) => void
  };
  const contextPage = "coreos";
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Listen for real AI responses
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
        validMessages.forEach((msg) => {
          const content = msg.response || msg.message || "";
          const mId = msg.messageId || `ai-${Date.now()}-${Math.random()}`;

          if (processedMessageIds.current.has(mId)) return;
          processedMessageIds.current.add(mId);

          const aiResponse: Message = {
            id: mId,
            sender: "ai",
            content: content,
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => {
            if (prev.find((m) => m.id === aiResponse.id)) return prev;
            return [...prev, aiResponse];
          });
        });
        clearMessages(contextPage);
      }
    }
  }, [orchestratorMessages, clearMessages]);

  const formatMessageContent = (content: string) => {
    const lines = content.split('\n');
    let html = "";
    let inList = false;
    let inSubList = false;
    let listType: "ordered" | "unordered" | null = null;

    const formatInlineStyles = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-900">$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-mono border border-blue-100">$1</code>')
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-blue-800/80">$1</em>')
        .replace(/_([^_]+)_/g, '<em class="italic text-blue-800/80">$1</em>');
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
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">${number}</span>
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
            <span class="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-blue-400"></span>
            <span class="text-sm leading-relaxed text-blue-800/80 italic">${text}</span>
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
            <span class="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-blue-500"></span>
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

  const handleSendMessage = async () => {
    if (inputMessage.trim()) {
      const messageContent = inputMessage.trim();
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        content: messageContent,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");

      // Store in shared context
      setRequestingPage(contextPage);
      localStorage.setItem("currentPage", contextPage);

      try {
        await Axios.post("/data/guides/orchestrator/observe", {
          current_page: contextPage,
          just_opened: false,
          message: messageContent,
          selected_company_id: localStorage.getItem("selectedCompanyId") || "",
          context: {
            selected_dataset: selectedDataset,
            chat_type: "global_assistant"
          }
        });
      } catch (error) {
        console.error("Error sending message to orchestrator:", error);
      }
    }
  };

  const handleQuickAction = (actionId: string) => {
    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      const actionMessage: Message = {
        id: Date.now().toString(),
        sender: "ai",
        content: `Executing ${action.label}... This may take a few moments.`,
        timestamp: new Date(),
        type: "action",
      };
      setMessages((prev) => [...prev, actionMessage]);
    }
  };

  const getStatusIcon = (status: ActiveAgent["status"]) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "working":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ActiveAgent["status"]) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50";
      case "working":
        return "text-blue-600 bg-blue-50";
      case "completed":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="px-6 py-4 bg-white flex-shrink-0">
            <SheetTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              AI Assistant
            </SheetTitle>
            <SheetDescription className="text-gray-600 mt-1">
              Get insights, automate tasks, and monitor your AI agents
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="bg-white px-4 sm:px-6 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg my-3 sm:my-4">
                  <TabsTrigger
                    value="chat"
                    className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 text-sm sm:text-base"
                  >
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger
                    value="actions"
                    className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 text-sm sm:text-base"
                  >
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    Actions
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 text-sm sm:text-base"
                  >
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                    Activity
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="chat"
                className="flex-1 flex flex-col px-4 sm:px-6 py-3 sm:py-4 overflow-hidden"
              >
                <div className="mb-4 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Data Context</span>
                    </div>
                  </div>
                  <select
                    value={selectedDataset}
                    onChange={(e) => setSelectedDataset(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {datasets.map((dataset) => (
                      <option key={dataset.id} value={dataset.id}>
                        {dataset.name} ({dataset.count} entries)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 bg-white rounded-xl p-4 mb-4 overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className="flex items-start gap-3 max-w-[85%]">
                          {message.sender === "ai" && (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <Bot className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                          <div
                            className={`rounded-xl p-3 ${message.sender === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            <div
                              className="text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                            />
                            <p className="text-xs opacity-70 mt-2">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 flex-shrink-0">
                  <Input
                    placeholder="Ask about your data..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="activity"
                className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Agents</h3>
                    <div className="space-y-3">
                      {activeAgents.map((agent) => (
                        <Card key={agent.id} className="bg-white">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(agent.status)}
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{agent.name}</p>
                                  <p className="text-xs text-gray-600">{agent.dataset}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                                {agent.status}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <div className="grid grid-cols-1 gap-3">
                  {quickActions.map((action) => (
                    <Card key={action.id} className="cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => handleQuickAction(action.id)}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                          {action.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{action.label}</p>
                          <p className="text-xs text-gray-600">{action.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
