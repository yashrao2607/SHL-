import { create } from 'zustand';

export interface Recommendation {
  name: string;
  url: string;
  test_type: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
  endOfConversation?: boolean;
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,

  sendMessage: async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));

    try {
      const { messages } = get();
      // Send all messages to the API for context
      const apiMessages = messages.map(({ role, content: msgContent }) => ({
        role,
        content: msgContent,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.reply || 'I apologize, but I was unable to generate a response.',
        recommendations: data.recommendations || [],
        endOfConversation: data.end_of_conversation || false,
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to send message:', error);

      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content:
          "I'm sorry, I encountered an error while processing your request. Please try again.",
        recommendations: [],
        endOfConversation: false,
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));

      // Re-throw so the UI can show a toast
      throw error;
    }
  },

  clearChat: () => {
    set({ messages: [], isLoading: false });
  },
}));
