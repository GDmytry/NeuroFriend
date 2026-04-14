import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { generateAssistantReply } from "../services/neuroAiService";
import { deleteServerThread, fetchServerThreads, hasServerSync, saveServerThread } from "../services/serverSyncApi";
import { storage } from "../services/storage";
import {
  AuthSession,
  ChatAttachment,
  ChatMessage,
  ChatThread,
  NeuralMode,
  SendMessageInput,
  User
} from "../types";
import { createId } from "../utils/id";

type ChatContextValue = {
  threads: ChatThread[];
  isReady: boolean;
  activeThreadId?: string;
  activeThread?: ChatThread;
  selectedMode: NeuralMode;
  setSelectedMode: (mode: NeuralMode) => void;
  selectThread: (threadId: string) => void;
  startNewChat: () => void;
  sendMessage: (input: SendMessageInput) => Promise<string>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  getThreadById: (threadId: string) => ChatThread | undefined;
};

const ChatSyncRuntimeContext = createContext<ChatContextValue | undefined>(undefined);

type ChatProviderProps = {
  children: React.ReactNode;
  currentUser: User | null;
  session: AuthSession | null;
};

function isServerSession(session: AuthSession | null | undefined) {
  return Boolean(session?.authMode === "server" && session.token);
}

function buildThreadTitle(text: string, attachments: ChatAttachment[] = []) {
  const trimmed = text.trim();
  const base = trimmed || attachments[0]?.name || "Новый диалог";
  return base.length > 32 ? `${base.slice(0, 32)}...` : base;
}

function buildVisibleUserText(text: string, attachments: ChatAttachment[] = []) {
  const trimmed = text.trim();

  if (trimmed) {
    return trimmed;
  }

  if (attachments.length === 1) {
    return `Файл: ${attachments[0].name}`;
  }

  if (attachments.length > 1) {
    return `Прикреплено файлов: ${attachments.length}`;
  }

  return "";
}

export function ChatProvider({ children, currentUser, session }: ChatProviderProps) {
  const [allThreads, setAllThreads] = useState<ChatThread[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [selectedMode, setSelectedMode] = useState<NeuralMode>("friend");
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const [isCreatingNewThread, setIsCreatingNewThread] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function bootstrap() {
      if (!currentUser) {
        if (!isActive) {
          return;
        }

        setAllThreads([]);
        setActiveThreadId(undefined);
        setIsCreatingNewThread(false);
        setIsReady(true);
        return;
      }

      setIsReady(false);

      try {
        if (isServerSession(session) && (await hasServerSync())) {
          const serverThreads = await fetchServerThreads(session?.token as string);

          if (!isActive) {
            return;
          }

          setAllThreads(serverThreads);
        } else {
          const localThreads = await storage.getThreads();

          if (!isActive) {
            return;
          }

          setAllThreads(localThreads);
        }
      } finally {
        if (isActive) {
          setIsReady(true);
        }
      }
    }

    void bootstrap();

    return () => {
      isActive = false;
    };
  }, [currentUser, session]);

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

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId),
    [activeThreadId, threads]
  );

  useEffect(() => {
    if (!currentUser) {
      setActiveThreadId(undefined);
      setIsCreatingNewThread(false);
      return;
    }

    if (!isReady) {
      return;
    }

    if (activeThreadId && threads.some((thread) => thread.id === activeThreadId)) {
      return;
    }

    if (isCreatingNewThread) {
      return;
    }

    const firstThread = threads[0];
    setActiveThreadId(firstThread?.id);

    if (firstThread) {
      setSelectedMode(firstThread.mode);
    }
  }, [activeThreadId, currentUser, isCreatingNewThread, isReady, threads]);

  async function persistLocal(nextThreads: ChatThread[]) {
    setAllThreads(nextThreads);
    await storage.saveThreads(nextThreads);
  }

  async function persistThread(nextThread: ChatThread) {
    if (isServerSession(session) && (await hasServerSync())) {
      const saved = await saveServerThread(session?.token as string, nextThread);
      setAllThreads((current) => {
        const exists = current.some((thread) => thread.id === saved.id);
        return exists
          ? current.map((thread) => (thread.id === saved.id ? saved : thread))
          : [...current, saved];
      });
      return saved;
    }

    const nextThreads = allThreads.some((thread) => thread.id === nextThread.id)
      ? allThreads.map((thread) => (thread.id === nextThread.id ? nextThread : thread))
      : [...allThreads, nextThread];
    await persistLocal(nextThreads);
    return nextThread;
  }

  const value = useMemo<ChatContextValue>(
    () => ({
      threads,
      isReady,
      activeThreadId,
      activeThread,
      selectedMode,
      setSelectedMode,
      selectThread: (threadId) => {
        const thread = threads.find((item) => item.id === threadId);
        setActiveThreadId(threadId);
        setIsCreatingNewThread(false);

        if (thread) {
          setSelectedMode(thread.mode);
        }
      },
      startNewChat: () => {
        setActiveThreadId(undefined);
        setIsCreatingNewThread(true);
        setSelectedMode(currentUser?.preferredMode ?? "friend");
      },
      getThreadById: (threadId) => threads.find((thread) => thread.id === threadId),
      renameThread: async (threadId, title) => {
        const normalizedTitle = title.trim();

        if (!normalizedTitle) {
          throw new Error("Название чата не может быть пустым");
        }

        const targetThread = allThreads.find((thread) => thread.id === threadId);

        if (!targetThread) {
          throw new Error("Чат не найден");
        }

        await persistThread({
          ...targetThread,
          title: normalizedTitle
        });
      },
      deleteThread: async (threadId) => {
        if (isServerSession(session) && (await hasServerSync())) {
          await deleteServerThread(session?.token as string, threadId);
          setAllThreads((current) => current.filter((thread) => thread.id !== threadId));
        } else {
          const nextThreads = allThreads.filter((thread) => thread.id !== threadId);
          await persistLocal(nextThreads);
        }

        if (activeThreadId === threadId) {
          const nextVisibleThread = threads.filter((thread) => thread.id !== threadId)[0];

          if (nextVisibleThread) {
            setActiveThreadId(nextVisibleThread.id);
            setIsCreatingNewThread(false);
            setSelectedMode(nextVisibleThread.mode);
          } else {
            setActiveThreadId(undefined);
            setIsCreatingNewThread(true);
            setSelectedMode(currentUser?.preferredMode ?? "friend");
          }
        }
      },
      sendMessage: async ({ threadId, text, mode, attachments = [] }) => {
        if (!currentUser) {
          throw new Error("Пользователь не авторизован");
        }

        const visibleText = buildVisibleUserText(text, attachments);

        if (!visibleText) {
          throw new Error("Добавьте сообщение или хотя бы один текстовый файл");
        }

        const now = new Date().toISOString();
        const userMessage: ChatMessage = {
          id: createId(),
          author: "user",
          text: visibleText,
          createdAt: now,
          attachments
        };

        const existingThread = threadId
          ? allThreads.find((thread) => thread.id === threadId && thread.userId === currentUser.id)
          : undefined;

        const baseThread: ChatThread =
          existingThread ?? {
            id: createId(),
            title: buildThreadTitle(text, attachments),
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
          latestUserMessage: visibleText,
          assistantName: currentUser.assistantName
        });

        const assistantMessage: ChatMessage = {
          id: createId(),
          author: "assistant",
          text: assistantText,
          createdAt: new Date().toISOString()
        };

        const updatedThread: ChatThread = {
          ...baseThread,
          title:
            baseThread.messages.length === 0
              ? buildThreadTitle(text, attachments)
              : baseThread.title,
          mode,
          updatedAt: assistantMessage.createdAt,
          messages: [...nextHistory, assistantMessage]
        };

        await persistThread(updatedThread);
        setActiveThreadId(updatedThread.id);
        setIsCreatingNewThread(false);
        return updatedThread.id;
      }
    }),
    [activeThread, activeThreadId, allThreads, currentUser, isReady, selectedMode, session, threads]
  );

  return <ChatSyncRuntimeContext.Provider value={value}>{children}</ChatSyncRuntimeContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatSyncRuntimeContext);

  if (!context) {
    throw new Error("useChat must be used inside ChatProvider");
  }

  return context;
}
