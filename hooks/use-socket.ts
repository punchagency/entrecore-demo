"use client";
/**
 * @deprecated This hook has been replaced by the WebSocket context.
 * Use `useWebSocket` from `@/contexts/websocket-context` instead.
 * The context provides a single WebSocket connection that can be used throughout the app.
 */

// This file is kept for backwards compatibility but should not be used.
// New code should use the WebSocket context instead.
import { useWebSocket as useWebSocketContext } from "@/contexts/websocket-context";

export const useWebSocket = () => {
  console.warn(
    "⚠️ useWebSocket from hooks/use-socket.ts is deprecated. Use import { useWebSocket } from '@/contexts/websocket-context' instead."
  );
  return useWebSocketContext();
};
