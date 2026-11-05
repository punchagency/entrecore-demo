"use client";
import { useUserStore } from "@/app/store/userStore";
import { ensureAccessToken } from "@/app/config/session";
// Demo: scripted WebSocket (demo/realtime) instead of the API.
import { DemoWebSocket } from "@/demo/realtime/websocket";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
// WebSocket connection states
export enum WebSocketState {
  CONNECTING = "connecting",
  OPEN = "open",
  CLOSING = "closing",
  CLOSED = "closed",
}

// Message types for typing
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  success?: boolean;
  response?: any;
  error?: any;
  paused?: boolean;
  checkpoint_id?: string;
}

// WebSocket context type
type WebSocketContextType = {
  // Connection state
  connectionState: WebSocketState;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  messages: WebSocketMessage[];

  // Actions
  connect: (url?: string) => void;
  disconnect: () => void;
  sendMessage: (message: WebSocketMessage | string) => void;
  subscribe: (callback: (message: WebSocketMessage) => void) => () => void;

  // Connection info
  url: string | null;
  error: string | null;
};

// Create the context
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Default WebSocket URL (can be overridden)
const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace("http", "ws").replace("https", "wss")}/ws`
    : null);

// Create a provider component
export const WebSocketProvider: React.FC<{
  children: React.ReactNode;
  defaultUrl?: string;
  autoConnect?: boolean;
}> = ({ children, defaultUrl = DEFAULT_WS_URL, autoConnect = false }) => {
  const socketRef = useRef<WebSocket | null>(null);
  const messageHistoryRef = useRef<WebSocketMessage[]>([]);
  const subscribersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());

  const [connectionState, setConnectionState] = useState<WebSocketState>(WebSocketState.CLOSED);
  const [url, setUrl] = useState<string | null>(defaultUrl);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const hasTriedToConnectRef = useRef(false);

  const { user } = useUserStore();
  // Update messages state when messageHistory changes
  useEffect(() => {
    setMessages([...messageHistoryRef.current]);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(
    async (connectUrl?: string) => {
      const targetUrl = connectUrl || url;

      if (!targetUrl) {
        setError("No WebSocket URL provided");
        return;
      }

      // Close existing connection if it exists
      if (socketRef.current) {
        socketRef.current.close();
      }

      console.log("🔌 Connecting to WebSocket:", targetUrl);
      setConnectionState(WebSocketState.CONNECTING);
      setError(null);
      setUrl(targetUrl);
      try {
        // EP-1043: in-memory token, restored from the refresh cookie if needed.
        const token = (await ensureAccessToken()) ?? "";
        const wsPath = `${targetUrl}/ws/${user?.id}-${Math.random().toString(36).substring(2, 6)}`;
        // Never log the full URL: it carries the access token.
        console.log(wsPath);
        const socket = new DemoWebSocket(`${wsPath}?token=${encodeURIComponent(token)}`) as unknown as WebSocket;
        socketRef.current = socket;

        socket.onopen = () => {
          console.log("✅ WebSocket connected");
          setConnectionState(WebSocketState.OPEN);
          setError(null);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const message: WebSocketMessage = {
              type: data.type || "unknown",
              data: data,
              timestamp: Date.now(),
            };

            // Add to history
            messageHistoryRef.current.push(message);
            if (messageHistoryRef.current.length > 100) {
              messageHistoryRef.current.shift(); // Keep only last 100 messages
            }

            setLastMessage(message);
            setMessages((prev) => [...prev, message]);

            // Notify subscribers
            for (const callback of Array.from(subscribersRef.current)) {
              try {
                callback(message);
              } catch (err) {
                console.error("Error in WebSocket subscriber callback:", err);
              }
            }

            console.log("📩 WebSocket message:", message);
          } catch (e) {
            console.log("Websockets Error: ", e);
            console.log("📩 Raw WebSocket message:", event.data);
            const rawMessage: WebSocketMessage = {
              type: "raw",
              data: event.data,
              timestamp: Date.now(),
            };

            messageHistoryRef.current.push(rawMessage);
            setLastMessage(rawMessage);
            setMessages((prev) => [...prev, rawMessage]);

            // Notify subscribers
            for (const callback of Array.from(subscribersRef.current)) {
              callback(rawMessage);
            }
          }
        };

        socket.onerror = (err) => {
          console.error("❌ WebSocket error:", err);
          setError("WebSocket connection error");
          setConnectionState(WebSocketState.CLOSED);
        };

        socket.onclose = (event) => {
          console.log("🔌 WebSocket closed:", event.code, event.reason);
          setConnectionState(WebSocketState.CLOSED);
          socketRef.current = null;

          // Auto-reconnect if not intentionally closed
          if (event.code !== 1000 && autoConnect) {
            console.log("🔄 Attempting to reconnect in 5 seconds...");
            setTimeout(() => connect(targetUrl), 5000);
          }
        };
      } catch (err) {
        console.error("❌ Failed to create WebSocket connection:", err);
        setError("Failed to create WebSocket connection");
        setConnectionState(WebSocketState.CLOSED);
      }
    },
    [url, autoConnect, user]
  );

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("🔌 Disconnecting WebSocket");
      socketRef.current.close(1000, "Client disconnect");
      socketRef.current = null;
    }
    setConnectionState(WebSocketState.CLOSED);
  }, []);

  // Send a message
  const sendMessage = useCallback((message: WebSocketMessage | string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const messageToSend = typeof message === "string" ? message : JSON.stringify(message);

      socketRef.current.send(messageToSend);
      console.log("📤 Sent WebSocket message:", message);
    } else {
      console.warn("⚠️ WebSocket not connected, cannot send message");
      setError("WebSocket not connected");
    }
  }, []);

  // Subscribe to messages
  const subscribe = useCallback((callback: (message: WebSocketMessage) => void) => {
    subscribersRef.current.add(callback);

    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  // Auto-connect once when user becomes available and we're not already connected
  useEffect(() => {
    if (autoConnect && url && user?.id && !hasTriedToConnectRef.current) {
      hasTriedToConnectRef.current = true;
      connect();
    }
  }, [autoConnect, url, user?.id]); // Removed connect from dependencies to prevent infinite loop

  // Reset connection attempt flag if user changes
  useEffect(() => {
    if (user?.id) {
      hasTriedToConnectRef.current = false;
    }
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: WebSocketContextType = useMemo(
    () => ({
      connectionState,
      isConnected: connectionState === WebSocketState.OPEN,
      lastMessage,
      messages,
      connect,
      disconnect,
      sendMessage,
      subscribe,
      url,
      error,
    }),
    [
      connectionState,
      lastMessage,
      messages,
      connect,
      disconnect,
      sendMessage,
      subscribe,
      url,
      error,
    ]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
