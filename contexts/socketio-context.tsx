"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { Socket } from "socket.io-client";
// Demo: scripted Socket.IO and workflow WebSocket (demo/realtime) instead of the API.
import { io } from "@/demo/realtime/socket-io";
import { DemoWebSocket } from "@/demo/realtime/websocket";
import { ensureAccessToken } from "@/app/config/session";
import { useUserStore } from "@/app/store/userStore";
import { useOrchestratorMessages, useOrchestratorStore } from "@/app/store/orchestratorStore";
import { toast } from "sonner";
import { ocrFailureMessage } from "@/utils/ocr-failure";
import {
  isWorkflowRunMessage,
  workflowRunEvent,
  workflowRunFailureNotice,
} from "@/utils/workflow-run-event";

// ---------------------------------------------------------------------------
// Socket.IO connection states
// ---------------------------------------------------------------------------
export enum SocketIOState {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

// ---------------------------------------------------------------------------
// Workflow WebSocket connection states (native WS → FastAPI)
// ---------------------------------------------------------------------------
export enum WorkflowWSState {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

// ---------------------------------------------------------------------------
// Shared message type
// ---------------------------------------------------------------------------
export interface SocketIOMessage {
  event: string;
  data?: any;
  timestamp?: number;
}

export interface WorkflowMessage {
  raw: string;
  parsed: any | null;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
type SocketIOContextType = {
  // ── Socket.IO ──────────────────────────────────────────────────────────
  connectionState: SocketIOState;
  isConnected: boolean;
  lastMessage: SocketIOMessage | null;
  messages: SocketIOMessage[];

  connect: (url?: string, auth?: any) => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
  getOrchestratorMessages: () => any[];
  clearOrchestratorMessages: () => void;
  reconnect: () => void;

  url: string | null;
  error: string | null;
  socket: Socket | null;

  // ── Workflow WebSocket (FastAPI native WS) ─────────────────────────────
  workflowWSState: WorkflowWSState;
  isWorkflowConnected: boolean;
  lastWorkflowMessage: WorkflowMessage | null;
  workflowMessages: WorkflowMessage[];
  workflowError: string | null;

  connectWorkflow: (userId?: string) => void;
  disconnectWorkflow: () => void;
  reconnectWorkflow: () => void;
};

// ---------------------------------------------------------------------------
// Context creation
// ---------------------------------------------------------------------------
const SocketIOContext = createContext<SocketIOContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_SOCKETIO_URL = process.env.NEXT_PUBLIC_WS_URL || "http://127.0.0.1:8001";

/**
 * Converts an http(s) base URL into a ws(s) URL so the workflow WebSocket
 * always targets the same host/port as the Socket.IO connection.
 *   http://host:8001  →  ws://host:8001
 *   https://host      →  wss://host
 */
const toWsUrl = (httpUrl: string): string =>
  httpUrl.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const SocketIOProvider: React.FC<{
  children: React.ReactNode;
  defaultUrl?: string;
  autoConnect?: boolean;
  autoConnectWorkflow?: boolean;
}> = ({
  children,
  defaultUrl = DEFAULT_SOCKETIO_URL,
  autoConnect = false,
  autoConnectWorkflow = false,
}) => {
  // ── Socket.IO refs / state ───────────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const messageHistoryRef = useRef<SocketIOMessage[]>([]);

  const addMessage = useOrchestratorStore((state) => state.addMessage);
  const getMessages = useOrchestratorStore((state) => state.getMessages);
  const clearMessages = useOrchestratorStore((state) => state.clearMessages);
  const { requestingPage } = useOrchestratorMessages();

  const [connectionState, setConnectionState] = useState<SocketIOState>(SocketIOState.DISCONNECTED);
  const [url, setUrl] = useState<string | null>(defaultUrl);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<SocketIOMessage | null>(null);
  const [messages, setMessages] = useState<SocketIOMessage[]>([]);
  const hasTriedToConnectRef = useRef(false);

  // ── Workflow WS refs / state ─────────────────────────────────────────────
  const workflowWSRef = useRef<WebSocket | null>(null);
  const workflowReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workflowReconnectAttemptsRef = useRef(0);
  const MAX_WORKFLOW_RECONNECT_ATTEMPTS = 5;
  const WORKFLOW_RECONNECT_BASE_DELAY_MS = 1500;

  const [workflowWSState, setWorkflowWSState] = useState<WorkflowWSState>(
    WorkflowWSState.DISCONNECTED
  );
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [lastWorkflowMessage, setLastWorkflowMessage] = useState<WorkflowMessage | null>(null);
  const [workflowMessages, setWorkflowMessages] = useState<WorkflowMessage[]>([]);

  const { user } = useUserStore();

  // Update messages state when messageHistory changes
  useEffect(() => {
    setMessages([...messageHistoryRef.current]);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Socket.IO – connect
  // ─────────────────────────────────────────────────────────────────────────
  const connect = useCallback(
    (connectUrl?: string, auth?: any) => {
      const targetUrl = connectUrl || url;

      if (!targetUrl) {
        setError("No Socket.IO URL provided");
        return;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      setConnectionState(SocketIOState.CONNECTING);
      setError(null);
      setUrl(targetUrl);

      try {
        const socket = io(targetUrl, {
          // EP-1043: the token lives in memory (restored from the refresh cookie
          // on a fresh load). As a callback it's re-read on every (re)connect, so
          // a reconnect after the token was refreshed doesn't send a stale one.
          auth:
            auth ||
            ((cb: (data: { token: string }) => void) => {
              void ensureAccessToken().then((token) => cb({ token: token ?? "" }));
            }),
          autoConnect: false,
          transports: ["websocket"],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          forceNew: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("=== SOCKET.IO CONNECTED ===", socket.id);
          setConnectionState(SocketIOState.CONNECTED);
          setError(null);
        });

        socket.on("disconnect", (reason) => {
          console.log("=== SOCKET.IO DISCONNECTED ===", reason);
          setConnectionState(SocketIOState.DISCONNECTED);
        });

        socket.on("connect_error", (err) => {
          console.log("=== SOCKET.IO CONNECTION ERROR ===", err.message);
          setError(`Connection error: ${err.message}`);
          setConnectionState(SocketIOState.ERROR);
        });

        socket.onAny((eventName, ...args) => {
          console.log("=== SOCKET.IO ANY EVENT ===", eventName, args);
        });

        socket.on("agent_response", (data) => {
          console.log("=== SOCKET.IO AGENT_RESPONSE RECEIVED ===", JSON.stringify(data, null, 2));

          const messageId = data.message_id;
          let responseData = data.result || data;

          if (typeof responseData === "string") {
            try {
              if (responseData.trim().startsWith("{") && responseData.trim().endsWith("}")) {
                responseData = JSON.parse(responseData);
              } else {
                responseData = { response: responseData, success: true };
              }
            } catch {
              responseData = { response: responseData, success: true };
            }
          }

          if (!responseData.hasOwnProperty("success")) {
            responseData = { ...responseData, success: true };
          }

          const savedCompanyId = localStorage.getItem("selectedCompanyId");
          const currentPage = requestingPage || "coreos";

          if (typeof responseData?.agent_config === "object") {
            if (responseData?.company_id !== savedCompanyId) {
              console.warn(
                `Company ID mismatch. Saved: ${savedCompanyId}, Received: ${responseData?.company_id}. Proceeding anyway.`
              );
            }
          }

          let currentMessages = useOrchestratorStore.getState().messages;
          if (currentMessages instanceof Array && messageId) {
            const foundMessage = currentMessages.find((item) => item.messageId === messageId);
            if (foundMessage) return;
            responseData.messageId = messageId;
          }

          useOrchestratorStore.getState().addMessage(responseData);

          currentMessages = useOrchestratorStore.getState().messages;
          console.log("=== MESSAGE ADDED TO STORE ===", currentMessages.length);

          const message: SocketIOMessage = {
            event: "agent_response",
            data: responseData,
            timestamp: Date.now(),
          };

          messageHistoryRef.current.push(message);
          if (messageHistoryRef.current.length > 100) {
            messageHistoryRef.current.shift();
          }

          setLastMessage(message);
          setMessages((prev) => [...prev, message]);
        });

        socket.on("ocr_response", (data) => {
          console.log("=== SOCKET.IO OCR_RESPONSE RECEIVED ===", JSON.stringify(data, null, 2));
          if (data.success) {
            toast.success(data.message || "OCR processing completed successfully");
          } else {
            // The backend appends the raw exception to this message; show only the readable part.
            toast.error(ocrFailureMessage(data.message));
          }
        });

        socket.connect();
      } catch {
        setError("Failed to create Socket.IO connection");
        setConnectionState(SocketIOState.ERROR);
      }
    },
    [url, user?.id, addMessage, getMessages, requestingPage]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Socket.IO – disconnect / reconnect / emit / subscribe
  // ─────────────────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionState(SocketIOState.DISCONNECTED);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      setError("Socket.IO not connected");
    }
  }, []);

  const getOrchestratorMessages = useCallback(() => {
    const msgs = getMessages();
    console.log("=== GET ORCHESTRATOR MESSAGES ===", msgs.length);
    return msgs;
  }, [getMessages]);

  const clearOrchestratorMessages = useCallback(() => {
    clearMessages();
    console.log("=== CLEAR ORCHESTRATOR MESSAGES ===");
  }, [clearMessages]);

  const subscribe = useCallback((_event: string, _callback: (data: any) => void) => {
    // kept for API compatibility
    return () => {};
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Workflow WebSocket (FastAPI native WS)
  // ─────────────────────────────────────────────────────────────────────────

  /** Internal builder – called both on first connect and on auto-reconnect. */
  const _buildWorkflowWS = useCallback(
    async (userId: string) => {
      // Clean up any previous instance
      if (workflowWSRef.current) {
        workflowWSRef.current.onclose = null; // prevent the old onclose from triggering reconnect
        workflowWSRef.current.close();
        workflowWSRef.current = null;
      }

      // Derive the WS base from the same URL used by Socket.IO
      const wsBase = toWsUrl(url ?? DEFAULT_SOCKETIO_URL);
      // EP-1043: in-memory token, restored from the refresh cookie if needed.
      const token = (await ensureAccessToken()) ?? "";
      const wsPath = `${wsBase}/ws/workflow/${userId}`;
      const wsUrl = `${wsPath}?token=${encodeURIComponent(token)}`;
      // Never log wsUrl itself: it carries the access token.
      console.log("=== WORKFLOW WS CONNECTING ===", wsPath);
      setWorkflowWSState(WorkflowWSState.CONNECTING);
      setWorkflowError(null);

      const ws = new DemoWebSocket(wsUrl) as unknown as WebSocket;
      workflowWSRef.current = ws;

      ws.onopen = () => {
        console.log("=== WORKFLOW WS CONNECTED ===");
        workflowReconnectAttemptsRef.current = 0;
        setWorkflowWSState(WorkflowWSState.CONNECTED);
        setWorkflowError(null);
      };

      ws.onmessage = (event) => {
        console.log("=== WORKFLOW WS MESSAGE ===", event.data);

        let parsed: any = null;
        try {
          parsed = JSON.parse(event.data);

          if (isWorkflowRunMessage(parsed)) {
            // Only a finished run is announced; node updates and cancelled/rejected runs are
            // never reported as success (utils/workflow-run-event.ts).
            const runEvent = workflowRunEvent(parsed);
            if (runEvent === "run_complete") {
              toast.success(parsed.message || "Workflow execution completed");
            } else if (runEvent === "run_failed") {
              const notice = workflowRunFailureNotice(parsed);
              if (notice.tone === "neutral") toast.message(notice.text);
              else toast.error(notice.text);
            }
          } else if (parsed.status === "failed") {
            toast.error(parsed.message || "Error discovered during workflow processing");
          } else {
            toast.success(parsed.message || "Workflow update received");
          }
        } catch {
          // keep parsed as null – raw string only
        }

        const msg: WorkflowMessage = {
          raw: event.data,
          parsed,
          timestamp: Date.now(),
        };

        setLastWorkflowMessage(msg);
        setWorkflowMessages((prev) => {
          const next = [...prev, msg];
          // keep bounded to 200 messages
          return next.length > 200 ? next.slice(next.length - 200) : next;
        });
      };

      ws.onerror = (event) => {
        console.error("=== WORKFLOW WS ERROR ===", event);
        setWorkflowError("Workflow WebSocket error");
        setWorkflowWSState(WorkflowWSState.ERROR);
      };

      ws.onclose = (event) => {
        console.log("=== WORKFLOW WS CLOSED ===", event.code, event.reason);
        setWorkflowWSState(WorkflowWSState.DISCONNECTED);

        // Attempt exponential-backoff reconnect (skip if closed cleanly with code 1000)
        if (
          event.code !== 1000 &&
          workflowReconnectAttemptsRef.current < MAX_WORKFLOW_RECONNECT_ATTEMPTS
        ) {
          const delay =
            WORKFLOW_RECONNECT_BASE_DELAY_MS * Math.pow(2, workflowReconnectAttemptsRef.current);
          workflowReconnectAttemptsRef.current += 1;
          console.log(
            `Workflow WS: reconnect attempt ${workflowReconnectAttemptsRef.current} in ${delay}ms`
          );
          workflowReconnectTimerRef.current = setTimeout(() => {
            void _buildWorkflowWS(userId);
          }, delay);
        } else if (workflowReconnectAttemptsRef.current >= MAX_WORKFLOW_RECONNECT_ATTEMPTS) {
          setWorkflowError("Workflow WebSocket max reconnect attempts reached");
          setWorkflowWSState(WorkflowWSState.ERROR);
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const connectWorkflow = useCallback(
    (userId?: string) => {
      const uid = userId || user?.id;
      if (!uid) {
        setWorkflowError("No user ID available for workflow WebSocket");
        return;
      }
      // Reset reconnect counter on manual connect
      workflowReconnectAttemptsRef.current = 0;
      if (workflowReconnectTimerRef.current) {
        clearTimeout(workflowReconnectTimerRef.current);
        workflowReconnectTimerRef.current = null;
      }
      void _buildWorkflowWS(uid);
    },
    [user?.id, _buildWorkflowWS]
  );

  const disconnectWorkflow = useCallback(() => {
    if (workflowReconnectTimerRef.current) {
      clearTimeout(workflowReconnectTimerRef.current);
      workflowReconnectTimerRef.current = null;
    }
    if (workflowWSRef.current) {
      workflowWSRef.current.onclose = null; // prevent reconnect logic
      workflowWSRef.current.close(1000, "manual disconnect");
      workflowWSRef.current = null;
    }
    workflowReconnectAttemptsRef.current = 0;
    setWorkflowWSState(WorkflowWSState.DISCONNECTED);
  }, []);

  const reconnectWorkflow = useCallback(() => {
    disconnectWorkflow();
    connectWorkflow();
  }, [disconnectWorkflow, connectWorkflow]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-connect effects
  // ─────────────────────────────────────────────────────────────────────────

  // Socket.IO auto-connect (once, when user is available)
  useEffect(() => {
    if (autoConnect && url && !hasTriedToConnectRef.current && user?.id) {
      hasTriedToConnectRef.current = true;
      connect();
    }
  }, [autoConnect, url, user?.id, connect]);

  // Workflow WS auto-connect (once, when user is available)
  useEffect(() => {
    if (autoConnectWorkflow && user?.id) {
      connectWorkflow(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnectWorkflow, user?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      disconnect();
      disconnectWorkflow();
    };
  }, [disconnect, disconnectWorkflow]);

  // ─────────────────────────────────────────────────────────────────────────
  // Backlog emit interval (Socket.IO)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current?.connected) {
        emit("backlog");
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [emit]);

  // ─────────────────────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────────────────────
  const value: SocketIOContextType = useMemo(
    () => ({
      // Socket.IO
      connectionState,
      isConnected: connectionState === SocketIOState.CONNECTED,
      lastMessage,
      messages,
      connect,
      disconnect,
      emit,
      subscribe,
      getOrchestratorMessages,
      clearOrchestratorMessages,
      reconnect,
      url,
      error,
      socket: socketRef.current,

      // Workflow WS
      workflowWSState,
      isWorkflowConnected: workflowWSState === WorkflowWSState.CONNECTED,
      lastWorkflowMessage,
      workflowMessages,
      workflowError,
      connectWorkflow,
      disconnectWorkflow,
      reconnectWorkflow,
    }),
    [
      connectionState,
      lastMessage,
      messages,
      connect,
      disconnect,
      emit,
      subscribe,
      getOrchestratorMessages,
      clearOrchestratorMessages,
      reconnect,
      url,
      error,
      workflowWSState,
      lastWorkflowMessage,
      workflowMessages,
      workflowError,
      connectWorkflow,
      disconnectWorkflow,
      reconnectWorkflow,
    ]
  );

  return <SocketIOContext.Provider value={value}>{children}</SocketIOContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Full context – use when you need both Socket.IO and Workflow WS. */
export const useSocketIO: any = () => {
  const context = useContext(SocketIOContext);
  if (!context) throw new Error("useSocketIO must be used within a SocketIOProvider");
  return context;
};

/**
 * Focused hook for workflow WebSocket only.
 * Keeps component re-renders scoped to workflow state changes.
 */
export const useWorkflowWS = () => {
  const {
    workflowWSState,
    isWorkflowConnected,
    lastWorkflowMessage,
    workflowMessages,
    workflowError,
    connectWorkflow,
    disconnectWorkflow,
    reconnectWorkflow,
  } = useSocketIO();

  return {
    workflowWSState,
    isWorkflowConnected,
    lastWorkflowMessage,
    workflowMessages,
    workflowError,
    connectWorkflow,
    disconnectWorkflow,
    reconnectWorkflow,
  };
};
