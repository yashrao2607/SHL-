import { create } from 'zustand';

export interface Recommendation {
  name: string;
  url: string;
  test_type: string;
  duration?: string;
  remote_testing?: boolean;
  adaptive?: boolean;
  category?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
  endOfConversation?: boolean;
  timestamp: number;
  feedback?: 'positive' | 'negative' | null;
}

export interface ConversationContext {
  role: string;
  seniority: string;
  technical_skills: string[];
  behavioral_requirements: string[];
  assessment_preferences: string[];
  must_have_constraints: string[];
  excluded_constraints: string[];
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  context: ConversationContext;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  setFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
  setContext: (context: ConversationContext) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const STORAGE_KEY = 'shl-chat-store';

interface PersistedState {
  messages: Message[];
  context: ConversationContext;
}

function loadFromStorage(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PersistedState;
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveToStorage(messages: Message[], context: ConversationContext) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, context }));
  } catch {
    // Ignore storage errors
  }
}

function clearStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

const defaultContext: ConversationContext = {
  role: '',
  seniority: '',
  technical_skills: [],
  behavioral_requirements: [],
  assessment_preferences: [],
  must_have_constraints: [],
  excluded_constraints: [],
};

// Extract context from the API response data
function extractContextFromResponse(data: Record<string, unknown>): ConversationContext | null {
  if (!data) return null;
  // The API may include context in the response in the future
  // For now, we parse it from the conversation messages
  return null;
}

export const useChatStore = create<ChatStore>((set, get) => {
  // Initialize from localStorage
  const persisted = typeof window !== 'undefined' ? loadFromStorage() : null;

  return {
    messages: persisted?.messages ?? [],
    isLoading: false,
    context: persisted?.context ?? defaultContext,

    sendMessage: async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      set((state) => {
        const newMessages = [...state.messages, userMessage];
        saveToStorage(newMessages, state.context);
        return {
          messages: newMessages,
          isLoading: true,
        };
      });

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
          timestamp: Date.now(),
        };

        // Try to extract context from the response
        const newContext = data.context || extractContextFromResponse(data);

        set((state) => {
          const updatedMessages = [...state.messages, assistantMessage];
          const updatedContext = newContext || state.context;
          saveToStorage(updatedMessages, updatedContext);
          return {
            messages: updatedMessages,
            isLoading: false,
            context: updatedContext,
          };
        });
      } catch (error) {
        console.error('Failed to send message:', error);

        const errorMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content:
            "I'm sorry, I encountered an error while processing your request. Please try again.",
          recommendations: [],
          endOfConversation: false,
          timestamp: Date.now(),
        };

        set((state) => {
          const updatedMessages = [...state.messages, errorMessage];
          saveToStorage(updatedMessages, state.context);
          return {
            messages: updatedMessages,
            isLoading: false,
          };
        });

        // Re-throw so the UI can show a toast
        throw error;
      }
    },

    clearChat: () => {
      clearStorage();
      set({ messages: [], isLoading: false, context: defaultContext });
    },

    setFeedback: (messageId: string, feedback: 'positive' | 'negative') => {
      set((state) => {
        const updatedMessages = state.messages.map((msg) =>
          msg.id === messageId ? { ...msg, feedback } : msg
        );
        saveToStorage(updatedMessages, state.context);
        return { messages: updatedMessages };
      });
    },

    setContext: (context: ConversationContext) => {
      set((state) => {
        saveToStorage(state.messages, context);
        return { context };
      });
    },
  };
});
