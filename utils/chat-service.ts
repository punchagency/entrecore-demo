import { Axios } from "@/app/config/axios";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "insight" | "action" | "error";
  metadata?: Record<string, any>;
}

export interface ChatSession {
  conversation_id: string;
  guide_id: string;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
  status: "active" | "inactive";
}

export interface SendMessageRequest {
  message: string;
  conversation_id?: string;
  use_tools?: boolean;
  current_page?: string;
}

export interface ChatResponse {
  message: string;
  conversation_id?: string;
  [key: string]: any; // Allow for additional response fields
}

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();

  /**
   * Send a message to a specific guide
   */
  async sendMessage(guideId: string, request: SendMessageRequest): Promise<ChatResponse> {
    try {
      const payload: any = {
        message: request.message,
        conversation_id: request.conversation_id,
        use_tools: true,
      };

      // Include current_page in payload if provided
      if (request.current_page) {
        payload.current_page = request.current_page;
      }

      const response = await Axios.post(`/data/guides/${guideId}/execute`, payload);

      return response.data;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw new Error("Failed to send message to guide");
    }
  }

  /**
   * Generate a new conversation ID
   */
  generateConversationId(): string {
    return Date.now().toString() + "-" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get local session from memory
   */
  getLocalSession(guideId: string): ChatSession | null {
    return this.sessions.get(guideId) || null;
  }

  /**
   * Create or update local session
   */
  updateLocalSession(guideId: string, session: Partial<ChatSession>): void {
    const existing = this.sessions.get(guideId);
    if (existing) {
      this.sessions.set(guideId, { ...existing, ...session });
    } else {
      this.sessions.set(guideId, {
        conversation_id: session.conversation_id || this.generateConversationId(),
        guide_id: guideId,
        messages: session.messages || [],
        created_at: session.created_at || new Date(),
        updated_at: new Date(),
        status: session.status || "active",
      });
    }
  }
}

export const chatService = new ChatService();
