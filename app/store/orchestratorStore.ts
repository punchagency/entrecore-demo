import { create } from "zustand";
import { useEffect, useState } from "react";

export interface OrchestratorMessage {
  id?: string;
  success: boolean;
  response?: string;
  message?: string;
  action?: string;
  type?: string;
  status?: string;
  checkpoint_id?: string;
  conversation_id?: string;
  tool_used?: string;
  timestamp?: number;
  current_page?: string;
  selected_company_id?: string;
  current_params?: string;
  messageId?: string;
}

interface OrchestratorState {
  messages: OrchestratorMessage[];
  messageCount: number;
  requestingPage?: string;
  addMessage: (message: OrchestratorMessage, requestingPage?: string) => void;
  getMessages: (page?: string) => OrchestratorMessage[];
  clearMessages: (page?: string) => void;
  setRequestingPage: (page: string) => void;
  getRequestingPage: () => string | undefined;
}

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  messages: [],
  messageCount: 0,
  requestingPage: undefined,

  addMessage: (message, requestingPage) => {
    set((state) => {
      const existingMessages = state.messages;
      const incommingMessageId = message.messageId;

      if (incommingMessageId && existingMessages.find((item) => item.messageId === incommingMessageId)) {
        return {
          messages: existingMessages,
          messageCount: state.messageCount,
          requestingPage: requestingPage || state.requestingPage,
        };
      }

      // Tag the message with the current requesting page if not already tagged
      const taggedMessage = {
        ...message,
        current_page: message.current_page || requestingPage || state.requestingPage
      };

      const newMessages = [...state.messages, taggedMessage];
      return {
        messages: newMessages,
        messageCount: state.messageCount + 1,
        requestingPage: requestingPage || state.requestingPage,
      };
    });
  },

  getMessages: (page?: string) => {
    const messages = get().messages;
    if (page) {
      return messages.filter(m => m.current_page === page);
    }
    return messages;
  },

  clearMessages: (page?: string) => {
    set((state) => {
      if (page) {
        return {
          messages: state.messages.filter(m => m.current_page !== page),
          messageCount: state.messageCount // We don't necessarily need to reset count
        };
      }
      return { messages: [], messageCount: 0 };
    });
  },

  setRequestingPage: (page: string) => {
    set({ requestingPage: page });
  },

  getRequestingPage: () => {
    return get().requestingPage;
  },
}));

// Subscribe to message changes for real-time updates
// Use both messages and messageCount to ensure re-renders
export const useOrchestratorMessages = () => {
  const messages = useOrchestratorStore((state) => state.messages);
  const messageCount = useOrchestratorStore((state) => state.messageCount);
  const clearMessages = useOrchestratorStore((state) => state.clearMessages);
  const requestingPage = useOrchestratorStore((state) => state.requestingPage);
  const setRequestingPage = useOrchestratorStore((state) => state.setRequestingPage);

  // Debug log on every hook call
  console.log("=== useOrchestratorMessages HOOK ===");
  console.log("messages:", messages);
  console.log("messageCount:", messageCount);
  console.log("requestingPage:", requestingPage);

  return { messages, clearMessages, messageCount, requestingPage, setRequestingPage };
};
