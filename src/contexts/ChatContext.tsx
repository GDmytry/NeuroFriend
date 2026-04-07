import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { generateAssistantReply } from "../services/aiService";
import { storage } from "../services/storage";
import { ChatMessage, ChatThread, NeuralMode, SendMessageInput, User } from "../types";
import { createId } from "../utils/id";

type ChatContextValue = {
  threads: ChatThread[];
  isReady: boolean;
  selectedMode: NeuralMode;
  setSelectedMode: (mode: NeuralMode) => void;
  sendMessage: (input: SendMessageInput) => Promise<string>;
  deleteThread: (threadId: string) => Promise<void>;
  getThreadById: (threadId: string) => ChatThread | undefined;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

type ChatProviderProps = {
  children: React.ReactNode;
  currentUser: User | null;
};

function buildThreadTitle(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}...` : trimmed;
}

export function ChatProvider({ children, currentUser }: ChatProviderProps) {
  const [allThreads, setAllThreads] = useState<ChatThread[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [selectedMode, setSelectedMode] = useState<NeuralMode>("friend");

  useEffect(() => {
    async function bootstrap() {
      const threads = await storage.getThreads();
      setAllThreads(threads);
      setIsReady(true);
    }

    bootstrap();
  }, []);

  useEffect(() => {
    setSelectedMode(currentUser?.preferredMode ?? "friend");
  }, [currentUser?.id, currentUser?.preferredMode]);

  const threads = useMemo(
    () =>
      allThreads
        .filter((thread) => thread.userId === currentUser?.id)
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [allThreads, currentUser?.id]
  );

  async function persist(nextThreads: ChatThread[]) {
    setAllThreads(nextThreads);
    await storage.saveThreads(nextThreads);
  }

  const value = useMemo<ChatContextValue>(
    () => ({
      threads,
      isReady,
      selectedMode,
      setSelectedMode,
      getThreadById: (threadId) => threads.find((thread) => thread.id === threadId),
      deleteThread: async (threadId) => {
        const nextThreads = allThreads.filter((thread) => thread.id !== threadId);
        await persist(nextThreads);
      },
      sendMessage: async ({ threadId, text, mode }) => {
        if (!currentUser) {
          throw new Error("Пользователь не авторизован");
        }

        if (!text.trim()) {
          throw new Error("Сообщение не может быть пустым");
        }

        const now = new Date().toISOString();
        const userMessage: ChatMessage = {
          id: createId(),
          author: "user",
          text: text.trim(),
          createdAt: now
        };

        const existingThread = threadId
          ? allThreads.find((thread) => thread.id === threadId && thread.userId === currentUser.id)
          : undefined;

        const baseThread: ChatThread =
          existingThread ?? {
            id: createId(),
            title: buildThreadTitle(text),
            mode,
            userId: currentUser.id,
            createdAt: now,
            updatedAt: now,
            messages: []
          };

        const nextHistory = [...baseThread.messages, userMessage];
        const assistantText = await generateAssistantReply({
          mode,
          history: nextHistory,
          latestUserMessage: text
        });

        const assistantMessage: ChatMessage = {
          id: createId(),
          author: "assistant",
          text: assistantText,
          createdAt: new Date().toISOString()
        };

        const updatedThread: ChatThread = {
          ...baseThread,
          title: baseThread.messages.length === 0 ? buildThreadTitle(text) : baseThread.title,
          mode,
          updatedAt: assistantMessage.createdAt,
          messages: [...nextHistory, assistantMessage]
        };

        const nextThreads = existingThread
          ? allThreads.map((thread) => (thread.id === updatedThread.id ? updatedThread : thread))
          : [...allThreads, updatedThread];

        await persist(nextThreads);
        return updatedThread.id;
      }
    }),
    [allThreads, currentUser, isReady, selectedMode, threads]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used inside ChatProvider");
  }

  return context;
}
