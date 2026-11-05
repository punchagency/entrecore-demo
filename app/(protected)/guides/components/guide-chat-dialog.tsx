"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Trash2, Zap, Clock, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGuideChat } from "@/hooks/use-guide-chat";
import { ChatMessage } from "@/utils/chat-service";
import { Guide } from "@/app/store/aiAgentsStore";
import { useOrchestratorMessages } from "@/app/store/orchestratorStore";
import { useSocketIO } from "@/contexts/socketio-context";

interface GuideChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guide: Guide;
}

export function GuideChatDialog({ open, onOpenChange, guide }: GuideChatDialogProps) {
  const [inputMessage, setInputMessage] = useState("");

  const { reconnect } = useSocketIO();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const pendingMessageIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    messages: orchestratorMessages,
    clearMessages,
    setRequestingPage,
    requestingPage,
  } = useOrchestratorMessages();

  // Debug: Log when component renders and orchestratorMessages changes
  console.log("=== GUIDE CHAT DIALOG RENDER ===");
  console.log("orchestratorMessages:", orchestratorMessages);
  console.log("orchestratorMessages.length:", orchestratorMessages.length);

  const [isTyping, setIsTyping] = useState(false);

  const {
    isLoading,
    isConnected,
    conversationId,
    sendMessage,
    addAssistantMessage,
    clearChat,
    startNewSession,
  } = useGuideChat({
    guideId: guide.id || "",
    guideName: guide.name,
    autoStart: true,
    currentPage: "guide",
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // Consume orchestrator messages pushed via Socket.IO
  useEffect(() => {
    if (!orchestratorMessages.length) return;

    console.log("Processing orchestrator messages:", orchestratorMessages);
    console.log("Current pendingMessageId:", pendingMessageIdRef.current);
    console.log("Current conversationId:", conversationId);

    // Only process the first message to avoid duplicates
    const messageData = orchestratorMessages[0];
    console.log("Processing message data:", messageData);

    // Skip messages not intended for guide pages
    // Only process messages that are for guide pages (no current_page set or current_page is "guide")
    if (
      (messageData as any)?.current_page &&
      (messageData as any).current_page !== "guide" &&
      (messageData as any).current_page !== "guides"
    ) {
      console.log(
        `Skipping message for page ${(messageData as any).current_page} (guide chat expects "guide" or "guides")`
      );
      clearMessages();
      return;
    }

    // Skip if there's no pending message waiting for a response
    // This prevents processing old/duplicate socket messages
    if (!pendingMessageIdRef.current) {
      console.log("No pending message, skipping processing but clearing store");
      clearMessages();
      return;
    }

    // Get message content - handle empty strings properly
    // Check for response first, then message, then provide a fallback
    let messageContent = messageData?.response;

    // If response is undefined or null, try message field
    if (messageContent === undefined || messageContent === null) {
      messageContent = messageData?.message;
    }

    // If still no content but we have a status, create a status message
    if (!messageContent && messageData?.status === "completed") {
      // messageContent = "Task completed successfully.";
      messageContent = "";
    } else if (!messageContent) {
      // If there's still no content, provide a default message
      messageContent =
        "I received your message but couldn't generate a response. Please try again.";
    }

    console.log("Final message content:", messageContent);

    const pendingId = pendingMessageIdRef.current;

    // Fill the loading bubble with the assistant response
    setMessages((prev: ChatMessage[]) =>
      prev.map((msg) =>
        msg.id === pendingId
          ? {
              ...msg,
              content: messageContent,
              type: "text",
              timestamp: new Date(),
            }
          : msg
      )
    );
    pendingMessageIdRef.current = null;

    // set false after receiving messages
    setIsTyping(false);

    // Update underlying chat session + reset loading flag
    addAssistantMessage(messageContent, "text");

    // Clear all messages from the store
    clearMessages();
  }, [orchestratorMessages, addAssistantMessage, clearMessages, conversationId]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset chat state when guide changes
  useEffect(() => {
    if (guide.id) {
      setMessages([]);
      setHasShownWelcome(false);
      pendingMessageIdRef.current = null;
    }
  }, [guide.id]);

  // Show welcome message when dialog opens for the first time
  useEffect(() => {
    if (open && !hasShownWelcome && messages.length === 0 && guide.name) {
      const welcomeMessage: ChatMessage = {
        id: `welcome-${Date.now()}`,
        sender: "assistant",
        content: `Hi! I'm ${guide.name}, your AI data assistant. I can help you analyze your data, answer questions about your portfolio, and provide insights about your investments. What would you like to explore today?`,
        timestamp: new Date(),
        type: "text",
      };

      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [open, hasShownWelcome, messages.length, guide.name]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const message = inputMessage.trim();
    setInputMessage("");

    // Set the requesting page so responses are filtered to guide page
    setRequestingPage("guide");

    //Set istyping true
    setIsTyping(true);
    lastChangeRef.current = Date.now();

    // Add user message immediately
    const userMessageId = `user-${Date.now()}-${Math.random()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: "user",
      content: message,
      timestamp: new Date(),
      type: "text",
    };

    // Create loading assistant message immediately
    const loadingMessageId = `loading-${Date.now()}-${Math.random()}`;
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      sender: "assistant",
      content: "",
      timestamp: new Date(),
      type: "text" as any, // Cast as text for TypeScript, will be handled specially
    };

    // Add both user message and loading message
    setMessages((prev: ChatMessage[]) => [...prev, userMessage, loadingMessage]);
    pendingMessageIdRef.current = loadingMessageId;

    // Use HTTP API to trigger agent execution
    // The backend will send responses via Socket.IO 'agent_response' events
    await sendMessage(message, true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageTypeColor = (type?: string) => {
    switch (type) {
      case "insight":
        return "bg-blue-50 border-blue-200";
      case "action":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const ThinkingIndicator = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600">Thinking</span>
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_1.2s_ease-in-out_infinite]" />
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_1.2s_ease-in-out_infinite] [animation-delay:0.15s]" />
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-[bounce_1.2s_ease-in-out_infinite] [animation-delay:0.3s]" />
      </div>
    </div>
  );

  const MessageBubble = ({ message }: { message: ChatMessage }) => (
    <div className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`flex items-start space-x-2 max-w-[80%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            message.sender === "user"
              ? "bg-blue-500 text-white"
              : message.sender === "assistant"
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {message.sender === "user" ? (
            <User className="w-4 h-4" />
          ) : message.sender === "assistant" ? (
            <Brain className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Message content */}
        <div className={`flex flex-col ${message.sender === "user" ? "items-end" : "items-start"}`}>
          <div
            className={`px-4 py-2 rounded-lg ${
              message.sender === "user"
                ? "bg-blue-500 text-white"
                : `bg-white border ${getMessageTypeColor(message.type)}`
            }`}
          >
            {message.content ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : message.sender === "assistant" ? (
              <ThinkingIndicator />
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Sending</span>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
            {message.type && message.type !== "text" && (
              <Badge variant="secondary" className="text-xs">
                {message.type}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col p-0 max-h-[70vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{guide.name}</h3>
              <p className="text-sm text-gray-500">{guide.model_type}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`}
                />
                <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
              {conversationId && (
                <Badge variant="outline" className="text-xs">
                  Conversation: {conversationId.slice(0, 8)}...
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearChat();
                  clearMessages();
                  setMessages([]);
                  setHasShownWelcome(false);
                  pendingMessageIdRef.current = null;
                }}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Input Area */}
        <div className="p-6 pt-4">
          {!isConnected && (
            <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800">Chat session not active</span>
                </div>
                <Button size="sm" variant="outline" onClick={startNewSession} disabled={isLoading}>
                  <Zap className="w-4 h-4 mr-2" />
                  Start Session
                </Button>
              </div>
            </Card>
          )}

          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isConnected ? "Ask me anything about your data..." : "Start a session to chat"
              }
              disabled={!isConnected || isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!isConnected || !inputMessage.trim() || isLoading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {guide.datasets && (
            <p className="text-xs text-gray-500 mt-2">
              Connected to datasets: {guide.datasets.map((i) => i.name).join(", ")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
