"use client";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Loader2,
  Send,
  MessageCircle,
  Brain,
  Bot,
  User,
  Sparkles,
  X,
  ChevronRight,
  Zap,
  Check,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { CenterLogo } from "./center-logo";
import { appsMapping } from "../constants";
import { CoreCircles } from "./core-circles";
import { saveBigQueryState, saveNetSuiteState, saveAirtableState, saveNotionState, saveGoogleDriveState, formatMessageContent } from "../utils";
import { AppGridItem } from "./app-grid-item";
import { AddLinkDialog } from "./add-link-dialog";
import { AddToCoreosDialog } from "./add-to-coreos-dialog";
import { CoreVisualizationProps, Service, App as AppType } from "../types";
import { ServiceSelectionModal } from "./service-selection-modal";
import { useBigQueryConnector } from "../hooks/useBigQueryConnector";
import { useNetSuiteConnector } from "../hooks/useNetSuiteConnector";
import { useAirtableConnector } from "../hooks/useAirtableConnector";
import { useGoogleDriveConnector } from "../hooks/useGoogleDriveConnector";
import { useSocketIO } from "@/contexts/socketio-context";
import { useOrchestratorMessages } from "@/app/store/orchestratorStore";
import { useCrawlJobStore } from "@/app/store/crawlJobStore";
import { Axios } from "@/app/config/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "suggestion" | "error" | "text";
  messageId?: string;
}

const CoreVisualization = ({
  searchQuery = "",
  showSidePanel = false,
  showNotifications = true,
  favorites = new Set<number>(),
  toggleFavorite,
  dynamicApps,
  setDynamicApps,
  onRemoveApp,
  onToggleSidePanel,
  selectedCompany,
  initialSuggestions,
}: CoreVisualizationProps) => {
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [showServiceSelectionModal, setShowServiceSelectionModal] = useState(false);

  // Chat state
  const { isConnected, reconnect } = useSocketIO();
  const {
    messages: orchestratorMessages,
    clearMessages,
    setRequestingPage,
    requestingPage,
  } = useOrchestratorMessages();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [botMessageIds, setBotMessageIds] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());
  const [activeToolId, setActiveToolId] = useState<number | null>(null);
  const [parsingConnectors, setParsingConnectors] = useState<Set<number>>(new Set());

  // Background Crawl state
  const { jobs: crawlJobs } = useCrawlJobStore();
  const lastProcessedJobStatus = useRef<Record<string, string>>({});
  const lastLoggedJobId = useRef<Record<string, number>>({});

  const { isCheckingConnector, showLoadingIndicator, connectorError, checkBigQueryConnector } =
    useBigQueryConnector({
      selectedCompany,
      favorites,
      toggleFavorite,
      setDynamicApps,
    });

  const {
    isCheckingConnector: isCheckingNetSuiteConnector,
    showLoadingIndicator: showNetSuiteLoadingIndicator,
    connectorError: netSuiteConnectorError,
    checkNetSuiteConnector,
  } = useNetSuiteConnector({
    selectedCompany,
    favorites,
    toggleFavorite,
    setDynamicApps,
  });

  const {
    isCheckingConnector: isCheckingAirtableConnector,
    showLoadingIndicator: showAirtableLoadingIndicator,
    connectorError: airtableConnectorError,
    checkAirtableConnector,
  } = useAirtableConnector({
    selectedCompany,
    favorites,
    toggleFavorite,
    setDynamicApps,
  });

  useGoogleDriveConnector({
    selectedCompany,
    favorites,
    toggleFavorite,
  });

  // /////This enables reconnect from dead socket connections
  const lastChangeRef = useRef(Date.now());

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

  useEffect(() => {
    if (orchestratorMessages.length > 0) {
      console.log({ orchestratorMessages, messages });

      //Also filter out messageId already in the system

      const validMessages = orchestratorMessages.filter(
        (msg) =>
          msg.success &&
          (msg.response || msg.message) &&
          !botMessageIds.includes(msg.messageId ?? "")
      );

      if (validMessages.length > 0) {
        setIsTyping(false);
        const messagesContent = validMessages.map((msg) => msg.response || msg.message);
        const messageIds: string[] = validMessages
          .filter((msg) => typeof msg.messageId === "string")
          .map((msg) => String(msg.messageId));
        const uniqueContent = Array.from(new Set(messagesContent));
        const combinedContent = uniqueContent.join("\n\n---\n\n");

        const firstMsg = validMessages[0];
        const batchId =
          firstMsg.conversation_id ||
          firstMsg.checkpoint_id ||
          firstMsg.id ||
          `batch-${Date.now()}`;

        if (!processedMessageIds.current.has(batchId)) {
          const newMessage: ChatMessage = {
            id: batchId,
            content: combinedContent,
            sender: "bot",
            timestamp: new Date(),
          };

          processedMessageIds.current.add(batchId);
          setMessages((prev) => [...prev, newMessage]);
          setIsChatActive(true);
          setBotMessageIds((prev) => [...prev, ...messageIds]);
        }
      }
      clearMessages();
    }
  }, [orchestratorMessages, clearMessages]);

  useEffect(() => {
    // Monitor background crawl jobs for status changes and logs
    Object.values(crawlJobs).forEach((job) => {
      const prevStatus = lastProcessedJobStatus.current[job.id];

      // Handle status changes
      if (prevStatus !== job.status) {
        if (job.status === "completed") {
          toast.success(
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-green-600">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </div>
                <span className="font-bold text-gray-900 tracking-tight">SUCCESS: {getAppNameByConnectorId(job.connectorId)}</span>
              </div>
              <p className="text-[13px] text-gray-600 font-medium pl-7">
                {job.message || "Crawl and profile completed successfully"}
              </p>
            </div>,
            {
              duration: 5000,
              icon: null,
              className: "bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[1.2rem] p-4",
            }
          );
        } else if (job.status === "failed") {
          toast.error(
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-600">
                  <AlertCircle className="h-3 w-3" strokeWidth={3} />
                </div>
                <span className="font-bold text-gray-900 tracking-tight">Sync failed for {getAppNameByConnectorId(job.connectorId)}</span>
              </div>
              <p className="text-[13px] text-gray-600 font-medium pl-7">
                {job.error || "An error occurred during the crawl process."}
              </p>
            </div>,
            {
              duration: 6000,
              icon: null,
              className: "bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[1.2rem] p-4",
            }
          );
        }
        lastProcessedJobStatus.current[job.id] = job.status;
      }

      // Handle new logs (show only errors or important info as toasts)
      const lastCount = lastLoggedJobId.current[job.id] || 0;
      if (job.logs.length > lastCount) {
        const newLogs = job.logs.slice(lastCount);
        newLogs.forEach(log => {
          if (log.level === "error") {
            toast.error(`Crawl Error: ${log.message}`, { duration: 3000 });
          } else if (log.level === "warning") {
            toast.warning(`Crawl Warning: ${log.message}`, { duration: 2000 });
          }
        });
        lastLoggedJobId.current[job.id] = job.logs.length;
      }
    });
  }, [crawlJobs]);

  const getAppNameByConnectorId = (connectorId?: string) => {
    if (!connectorId) return "Unknown Service";
    if (connectorId === process.env.NEXT_PUBLIC_BIG_QUERY_CONNECTOR_ID) return "BigQuery";
    if (connectorId === process.env.NEXT_PUBLIC_NET_SUITE_CONNECTOR_ID) return "NetSuite";
    if (connectorId === process.env.NEXT_PUBLIC_AIRTABLE_CONNECTOR_ID) return "Airtable";
    if (connectorId === process.env.NEXT_PUBLIC_NOTION_CONNECTOR_ID) return "Notion";
    return "Service";
  };

  const getCrawlStateForApp = (appId: number) => {
    const connectorIds: Record<number, string | undefined> = {
      9: process.env.NEXT_PUBLIC_BIG_QUERY_CONNECTOR_ID,
      27: process.env.NEXT_PUBLIC_NET_SUITE_CONNECTOR_ID,
      2: process.env.NEXT_PUBLIC_AIRTABLE_CONNECTOR_ID,
      28: process.env.NEXT_PUBLIC_NOTION_CONNECTOR_ID,
    };

    const targetConnectorId = connectorIds[appId];
    if (!targetConnectorId) return { isCrawling: false, progress: 0 };

    const activeJob = Object.values(crawlJobs).find(
      j => j.connectorId === targetConnectorId && ["running", "pending", "starting"].includes(j.status)
    );

    return {
      isCrawling: !!activeJob,
      progress: activeJob?.progress || 0
    };
  };

  useEffect(() => {
    const resetAnimationState = () => {
      if (!showAddDialog && !showAddLinkDialog && !showServiceSelectionModal) {
        setIsAnimationPaused(false);
      }
    };

    resetAnimationState();
  }, [showAddDialog, showAddLinkDialog, showServiceSelectionModal]);

  useEffect(() => {
    if (initialSuggestions && initialSuggestions.length > 0 && messages.length === 0) {
      console.log("CoreVisualization: Loading initial suggestions", initialSuggestions);

      const suggestionMessages = initialSuggestions.map((s) => ({
        id: "sug-" + Math.random(),
        content: s.description || s.action || s,
        sender: "bot" as const,
        timestamp: new Date(),
      }));

      const uniqueSuggestions = Array.from(
        new Map(suggestionMessages.map((item) => [item.content, item])).values()
      );

      setMessages(uniqueSuggestions);
      // Auto-activate chat has been removed to keep Orchestrator minimized by default
      // setIsChatActive(true);
    }
  }, [initialSuggestions]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || inputMessage;
    if (!messageToSend.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: messageToSend,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    setIsChatActive(true);
    lastChangeRef.current = Date.now();
    try {
      await Axios.post("/data/guides/orchestrator/observe", {
        current_page: "coreos",
        just_opened: false,
        message: messageToSend,
        selected_company_id: selectedCompany?.id,
      });
    } catch (error: any) {
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: "error-" + Date.now(),
        content: `Failed to send message: ${error.response?.data?.message || error.message}.`,
        sender: "bot",
        timestamp: new Date(),
        type: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const favoriteApps = Array.from(favorites)
    .map((id) => {
      const app = appsMapping[id as keyof typeof appsMapping] || dynamicApps[id];
      return app;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const enabledIds = [9, 27, 2, 28]; // BigQuery, NetSuite, Airtable, Notion
      const aIndex = enabledIds.indexOf(a.id);
      const bIndex = enabledIds.indexOf(b.id);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });

  console.log("CoreVisualization: favorites size", favorites.size, "favoriteApps", favoriteApps);

  const gridApps = favoriteApps.slice(0, 8);
  const filteredApps = searchQuery
    ? gridApps.filter((app) => app.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : gridApps;

  const handleAddClick = () => setShowAddDialog(true);
  const handleLinkClick = () => {
    setShowAddDialog(false);
    setShowAddLinkDialog(true);
  };
  const handleAppServiceClick = () => {
    setShowAddDialog(false);
    setShowServiceSelectionModal(true);
  };

  const handleServiceSelect = (service: Service) => {
    const appId = [9, 27, 2, 28, 29].includes(service.id) ? service.id : service.id + 100;

    if (!favorites.has(appId)) {
      if (selectedCompany?.id) {
        if (service.id === 9) saveBigQueryState(true, selectedCompany.id);
        if (service.id === 27) saveNetSuiteState(true, selectedCompany.id);
        if (service.id === 2) saveAirtableState(true, selectedCompany.id);
        if (service.id === 28) saveNotionState(true, selectedCompany.id);
        if (service.id === 29) saveGoogleDriveState(true, selectedCompany.id);
      }

      toggleFavorite(appId);

      if (![9, 27, 2, 28, 29].includes(service.id)) {
        setDynamicApps((prev) => ({
          ...prev,
          [appId]: {
            id: appId,
            name: service.name,
            imagePath: service.logo,
            color: "#2563EB",
            isInner: true,
            notifications: 0,
          },
        }));
      }
      toast.success(`${service.name} added successfully!`);
    }
  };

  const getOrbitalPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

    // Adjusted radii to sit on the outer circle ring
    const radiusX = isDesktop ? (showSidePanel ? 175 : 250) : 130;
    const radiusY = isDesktop ? (showSidePanel ? 160 : 220) : 115;

    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
    };
  };

  const LightningBolt = ({ from, to, color }: { from: { x: number, y: number }, to: { x: number, y: number }, color: string }) => {
    const [points, setPoints] = useState<string>("");

    useEffect(() => {
      const updateBolt = () => {
        const parts = 6;
        const dX = to.x - from.x;
        const dY = to.y - from.y;
        let path = `M ${from.x} ${from.y}`;

        for (let i = 1; i < parts; i++) {
          const x = from.x + (dX * i) / parts + (Math.random() - 0.5) * 40;
          const y = from.y + (dY * i) / parts + (Math.random() - 0.5) * 40;
          path += ` L ${x} ${y}`;
        }
        path += ` L ${to.x} ${to.y}`;
        setPoints(path);
      };

      updateBolt();
      const interval = setInterval(updateBolt, 80);
      return () => clearInterval(interval);
    }, [from, to]);

    return (
      <motion.path
        d={points}
        stroke={color}
        strokeWidth="3"
        fill="none"
        filter="blur(0.5px)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 1, 0.6, 1, 0.3] }}
        transition={{ duration: 0.2, repeat: Infinity }}
        exit={{ opacity: 0 }}
        className="drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]"
        style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
      />
    );
  };

  return (
    <div className="relative w-full h-full mx-auto overflow-hidden flex items-center justify-center">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(37, 99, 235, 0.3);
        }
      `}</style>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        <Button
          onClick={handleAddClick}
          className="group relative h-10 px-6 bg-white/80 backdrop-blur-md rounded-full border border-blue-100 shadow-[0_8px_30px_rgba(37,99,235,0.1)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.2)] hover:border-blue-400 transition-all duration-500 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <Plus className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em]">
              Add Service
            </span>
          </div>
        </Button>

        <Button
          onClick={onToggleSidePanel}
          className="group relative h-10 px-5 bg-white/60 backdrop-blur-md rounded-full border border-white/60 shadow-sm hover:bg-white hover:border-blue-200 transition-all duration-300 flex items-center gap-2"
        >
          <div
            className={cn(
              "w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors",
              showSidePanel && "bg-blue-50"
            )}
          >
            <ChevronRight
              className={cn(
                "w-3 h-3 text-gray-500 group-hover:text-blue-600 transition-all duration-500",
                showSidePanel ? "rotate-180 text-blue-600" : ""
              )}
            />
          </div>
          <span className="text-[10px] font-black text-gray-500 group-hover:text-blue-600 uppercase tracking-[0.2em]">
            {showSidePanel ? "Hide Sidebar" : "Show Sidebar"}
          </span>
        </Button>
      </div>

      {/* Connection Status */}
      {(showLoadingIndicator || showNetSuiteLoadingIndicator || showAirtableLoadingIndicator) && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 left-4 z-50 flex items-center gap-3 px-5 py-2.5 bg-white/60 backdrop-blur-xl border border-white/60 rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.1)]"
        >
          <div className="relative">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <div className="absolute inset-0 bg-blue-400/20 blur-sm rounded-full animate-pulse" />
          </div>
          <span className="text-[10px] text-gray-700 font-black uppercase tracking-[0.15em] whitespace-nowrap">
            Syncing Connectors
          </span>
        </motion.div>
      )}

      {/* Visual Workspace */}
      <CoreCircles showSidePanel={showSidePanel} isAnimationPaused={isAnimationPaused}>
        <div className="absolute inset-0 z-20">
          {/* Orbital Apps */}
          <AnimatePresence>
            {filteredApps.map((app, index) => {
              const position = getOrbitalPosition(index, filteredApps.length);
              return (
                <motion.div
                  key={app.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    left: `calc(50% + ${position.x}px)`,
                    top: `calc(50% + ${position.y}px)`,
                    scale: 1,
                    opacity: 1,
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    delay: index * 0.05,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto"
                >
                  <AppGridItem
                    app={app}
                    index={index}
                    showSidePanel={showSidePanel}
                    showNotifications={showNotifications}
                    isAnimationPaused={isAnimationPaused}
                    setIsAnimationPaused={setIsAnimationPaused}
                    onToggleFavorite={toggleFavorite}
                    onRemoveApp={onRemoveApp}
                    selectedCompany={selectedCompany}
                    isCrawling={getCrawlStateForApp(app.id).isCrawling}
                    crawlProgress={getCrawlStateForApp(app.id).progress}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Central Interaction Area */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={cn(
                "w-full max-w-[min(85vw,520px)] min-h-[400px] flex flex-col items-center justify-end pointer-events-none transition-all duration-500 pb-2 md:pb-6",
                !isHovered && !isChatActive ? "opacity-60" : "opacity-100"
              )}
            >
              {/* Dynamic Central Content (Logo or Chat Window) */}
              <div className="flex-1 w-full flex flex-col min-h-0 pointer-events-none mb-4">
                <AnimatePresence mode="wait">
                  {!isChatActive ? (
                    <motion.div
                      key="branding-logo"
                      initial={{ scale: 0.8, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.8, opacity: 0, y: 20 }}
                      className="flex-1 w-full flex items-center justify-center pointer-events-auto"
                    >
                      <CenterLogo selectedCompany={selectedCompany} showSidePanel={showSidePanel} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chat-window"
                      initial={{ opacity: 0, scale: 0.95, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 30 }}
                      className="flex-1 w-full max-h-[480px] bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col pointer-events-auto"
                    >
                      {/* Chat Header */}
                      <div className="px-6 py-4 border-b border-gray-100/50 flex items-center justify-between bg-white/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Brain className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-800">Orchestrator</h3>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">
                                Adaptive AI active
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setIsChatActive(false);
                            setMessages([]);
                          }}
                          className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <ScrollArea className="flex-1 px-4 py-6 custom-scrollbar">
                        <div className="space-y-6">
                          {messages.map((msg) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, x: msg.sender === "user" ? 20 : -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={cn(
                                "flex flex-col gap-1.5",
                                msg.sender === "user" ? "items-end" : "items-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed max-w-[90%]",
                                  msg.sender === "user"
                                    ? "bg-blue-600 text-white rounded-tr-none shadow-xl shadow-blue-500/10 font-medium"
                                    : "bg-white text-gray-700 border border-gray-100/50 rounded-tl-none shadow-sm font-normal"
                                )}
                              >
                                {msg.sender === "user" ? (
                                  msg.content
                                ) : (
                                  <div className="markdown-content">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        p: ({ children }) => (
                                          <p className="mb-2 leading-relaxed last:mb-0">
                                            {children}
                                          </p>
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
                                        strong: ({ children }) => (
                                          <strong className="font-bold text-blue-800 dark:text-blue-300">
                                            {children}
                                          </strong>
                                        ),
                                        code: ({ children }) => (
                                          <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-blue-300 text-xs font-mono border border-blue-100 dark:border-gray-700">
                                            {children}
                                          </code>
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
                                        hr: () => (
                                          <hr className="my-4 border-t border-gray-200 dark:border-gray-700/50" />
                                        ),
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
                                      }}
                                    >
                                      {formatMessageContent(msg.content)}
                                    </ReactMarkdown>
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                {msg.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </motion.div>
                          ))}
                          {isTyping && (
                            <div className="flex flex-col items-start gap-2 px-2">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <motion.div
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="w-1.5 h-1.5 rounded-full bg-blue-500"
                                  />
                                  <motion.div
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                    className="w-1.5 h-1.5 rounded-full bg-blue-500"
                                  />
                                  <motion.div
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                    className="w-1.5 h-1.5 rounded-full bg-blue-500"
                                  />
                                </div>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter italic">
                                  Deep Thinking...
                                </span>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} className="h-2" />
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Interaction Hub (Input Area) */}
              <div
                className={cn(
                  "relative w-full flex flex-col transition-all duration-700 ease-in-out",
                  !isHovered && isChatActive ? "opacity-40" : "opacity-100"
                )}
              >
                <div className="relative group w-full pointer-events-auto">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-[1.8rem] border border-gray-200/50 shadow-2xl overflow-hidden p-2 md:p-3 cursor-text">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-50 flex items-center justify-center mr-3 shrink-0">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                    </div>
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Consult with Orchestrator..."
                      className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-0 text-gray-800 text-sm md:text-base font-semibold placeholder:text-gray-400 placeholder:font-medium"
                    />
                    <div className="flex items-center gap-2 ml-2 pr-1">
                      {isChatActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIsChatActive(false);
                            setMessages([]);
                          }}
                          className="h-10 w-10 text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        onClick={() => handleSendMessage()}
                        disabled={!inputMessage.trim() || isTyping}
                        className={cn(
                          "h-10 w-10 md:h-12 md:w-12 rounded-full transition-all duration-500",
                          inputMessage.trim()
                            ? "bg-blue-600 hover:bg-blue-700 shadow-[0_8px_20px_rgba(37,99,235,0.3)] scale-100"
                            : "bg-gray-100 text-gray-400 scale-90"
                        )}
                      >
                        <Send className="h-5 w-5 text-white" />
                      </Button>
                    </div>
                  </div>

                  {/* Contextual Suggestions Area */}
                  {!isChatActive && (
                    <motion.div
                      layout
                      className="mt-8 flex flex-wrap justify-center gap-3 pointer-events-none"
                    >
                      {["Run performance audit", "Connect new data", "Optimize workflow"].map(
                        (suggestion, i) => (
                          <motion.button
                            key={suggestion}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i }}
                            onClick={() => {
                              handleSendMessage(suggestion);
                            }}
                            className="px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200/50 rounded-full text-[10px] font-bold text-gray-500 hover:text-blue-600 hover:bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 transition-all flex items-center gap-2 group/btn uppercase tracking-wider pointer-events-auto"
                          >
                            <Zap className="h-3 w-3 text-blue-500" />
                            {suggestion}
                          </motion.button>
                        )
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CoreCircles>

      {/* Modals */}
      <AddToCoreosDialog
        isOpen={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setIsAnimationPaused(false);
        }}
        onLinkClick={handleLinkClick}
        onAppServiceClick={handleAppServiceClick}
      />
      <ServiceSelectionModal
        isOpen={showServiceSelectionModal}
        onClose={() => {
          setShowServiceSelectionModal(false);
          setIsAnimationPaused(false);
        }}
        onServiceSelect={handleServiceSelect}
        selectedCompany={selectedCompany}
      />
      <AddLinkDialog
        isOpen={showAddLinkDialog}
        onClose={() => {
          setShowAddLinkDialog(false);
          setIsAnimationPaused(false);
        }}
        onCreateLink={() => {
          setShowAddLinkDialog(false);
          toast.success("Link added!");
        }}
      />
    </div>
  );
};

export default CoreVisualization;
