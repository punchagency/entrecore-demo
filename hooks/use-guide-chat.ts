import { useState, useEffect, useCallback } from "react";
import { chatService, ChatMessage, ChatSession } from "@/utils/chat-service";
import { toast } from "sonner";

export interface UseGuideChatProps {
  guideId: string;
  guideName?: string;
  autoStart?: boolean;
  currentPage?: string;
}

export interface UseGuideChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isConnected: boolean;
  conversationId: string | null;
  sendMessage: (message: string, useTools?: boolean) => Promise<void>;
  addAssistantMessage: (content: string, type?: ChatMessage["type"], timestamp?: Date) => void;
  clearChat: () => void;
  startNewSession: () => void;
}

export function useGuideChat({
  guideId,
  guideName = "Guide",
  autoStart = true,
  currentPage = "guide",
}: UseGuideChatProps): UseGuideChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Initialize chat session
  const initializeChat = useCallback(() => {
    if (!guideId) return;

    try {
      // Try to get existing session from local storage
      const existingSession = chatService.getLocalSession(guideId);

      if (existingSession && existingSession.status === "active") {
        setConversationId(existingSession.conversation_id);
        setMessages(existingSession.messages);
        setIsConnected(true);
      } else if (autoStart) {
        // Start new session
        startNewSession();
      }
    } catch (error) {
      console.error("Failed to initialize chat:", error);
      toast.error("Failed to connect to guide chat");
    }
  }, [guideId, autoStart]);

  // Start new chat session
  const startNewSession = useCallback(() => {
    if (!guideId) return;

    try {
      const newConversationId = chatService.generateConversationId();
      setConversationId(newConversationId);
      setIsConnected(true);

      // Create welcome message
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: "assistant",
        content: `Hello! I'm ${guideName}. How can I help you today?`,
        timestamp: new Date(),
        type: "text",
      };

      setMessages([welcomeMessage]);

      // Update local session
      chatService.updateLocalSession(guideId, {
        conversation_id: newConversationId,
        messages: [welcomeMessage],
        status: "active",
      });

      toast.success(`Connected to ${guideName}`);
    } catch (error) {
      console.error("Failed to start chat session:", error);
      toast.error("Failed to start chat session");
    }
  }, [guideId, guideName]);

  // Send message to guide (only adds user message, responses come via websocket)
  const sendMessage = useCallback(
    async (message: string, useTools: boolean = true) => {
      if (!guideId || !conversationId || !message.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: "user",
        content: message.trim(),
        timestamp: new Date(),
        type: "text",
      };

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await chatService.sendMessage(guideId, {
          message: message.trim(),
          conversation_id: conversationId,
          use_tools: useTools,
          current_page: currentPage,
        });

        console.log("Guide processing started:", response);

        // Update conversation ID from response if provided
        if (response.conversation_id) {
          setConversationId(response.conversation_id);
        }

        // Note: We don't add assistant message here - it will come via websocket
        // Keep loading state true until websocket responds
      } catch (error) {
        console.error("Failed to send message:", error);
        toast.error("Failed to send message");

        // Add error message
        const errorMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          sender: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
          type: "error",
        };

        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
      }
    },
    [guideId, conversationId]
  );

  // Add assistant message (from websocket responses)
  const addAssistantMessage = useCallback(
    (content: string, type: ChatMessage["type"] = "text", timestamp: Date = new Date()) => {
      console.log("Adding assistant message:", { content, type });
      const assistantMessage: ChatMessage = {
        id: (Date.now() + Math.random()).toString(),
        sender: "assistant",
        content,
        timestamp,
        type,
      };

      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage];
        console.log("Updated messages array:", newMessages.length, "messages");

        // Update local session with current messages + new one
        chatService.updateLocalSession(guideId, {
          conversation_id: conversationId ?? undefined,
          messages: newMessages,
          updated_at: new Date(),
        });

        return newMessages;
      });

      console.log("Setting isLoading to false");
      setIsLoading(false); // Turn off loading when assistant responds
    },
    [guideId, conversationId]
  );

  // Clear chat messages
  const clearChat = useCallback(() => {
    setMessages([]);
    chatService.updateLocalSession(guideId, {
      messages: [],
      updated_at: new Date(),
    });
  }, [guideId]);

  // Initialize on mount
  useEffect(() => {
    if (guideId) {
      initializeChat();
    }
  }, [guideId, initializeChat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationId && guideId) {
        chatService.updateLocalSession(guideId, {
          updated_at: new Date(),
        });
      }
    };
  }, [guideId, conversationId]);

  return {
    messages,
    isLoading,
    isConnected,
    conversationId,
    sendMessage,
    addAssistantMessage,
    clearChat,
    startNewSession,
  };
}
