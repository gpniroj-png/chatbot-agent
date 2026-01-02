import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  isLoading?: boolean;
  error?: string;
}

export interface UIPreferences {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  autoScroll: boolean;
  showTimestamps: boolean;
  compactMode: boolean;
}

export interface ChatStoreState {
  // Chat state
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  currentSessionId: string;

  // UI preferences
  uiPreferences: UIPreferences;

  // Chat actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;

  // Session actions
  startNewSession: () => void;
  getCurrentSessionId: () => string;

  // UI preference actions
  setTheme: (theme: 'light' | 'dark') => void;
  setFontSize: (fontSize: 'small' | 'medium' | 'large') => void;
  setAutoScroll: (autoScroll: boolean) => void;
  setShowTimestamps: (showTimestamps: boolean) => void;
  setCompactMode: (compactMode: boolean) => void;
  updateUIPreferences: (preferences: Partial<UIPreferences>) => void;

  // Utility actions
  getMessages: () => Message[];
  getMessageCount: () => number;
}

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const defaultUIPreferences: UIPreferences = {
  theme: 'light',
  fontSize: 'medium',
  autoScroll: true,
  showTimestamps: true,
  compactMode: false,
};

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      isLoading: false,
      error: null,
      currentSessionId: generateSessionId(),
      uiPreferences: defaultUIPreferences,

      // Chat actions
      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: generateMessageId(),
          timestamp: Date.now(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      removeMessage: (id) => {
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== id),
        }));
      },

      clearMessages: () => {
        set({
          messages: [],
          error: null,
        });
      },

      setIsLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        }));
      },

      // Session actions
      startNewSession: () => {
        set({
          currentSessionId: generateSessionId(),
          messages: [],
          error: null,
          isLoading: false,
        });
      },

      getCurrentSessionId: () => {
        return get().currentSessionId;
      },

      // UI preference actions
      setTheme: (theme) => {
        set((state) => ({
          uiPreferences: {
            ...state.uiPreferences,
            theme,
          },
        }));
      },

      setFontSize: (fontSize) => {
        set((state) => ({
          uiPreferences: {
            ...state.uiPreferences,
            fontSize,
          },
        }));
      },

      setAutoScroll: (autoScroll) => {
        set((state) => ({
          uiPreferences: {
            ...state.uiPreferences,
            autoScroll,
          },
        }));
      },

      setShowTimestamps: (showTimestamps) => {
        set((state) => ({
          uiPreferences: {
            ...state.uiPreferences,
            showTimestamps,
          },
        }));
      },

      setCompactMode: (compactMode) => {
        set((state) => ({
          uiPreferences: {
            ...state.uiPreferences,
            compactMode,
          },
        }));
      },

      updateUIPreferences: (preferences) => {
        set((state) => ({
          uiPreferences: {
            ...state.uiPreferences,
            ...preferences,
          },
        }));
      },

      // Utility actions
      getMessages: () => {
        return get().messages;
      },

      getMessageCount: () => {
        return get().messages.length;
      },
    }),
    {
      name: 'chat-store',
      version: 1,
      partialize: (state) => ({
        // Persist only UI preferences and session ID
        // Messages can be persisted if desired, currently only preferences are persisted
        uiPreferences: state.uiPreferences,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
