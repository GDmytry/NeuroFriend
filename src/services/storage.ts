import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthSession, ChatThread, NeuralMode, User } from "../types";

const KEYS = {
  users: "neuro-chat/users",
  session: "neuro-chat/session",
  chats: "neuro-chat/chats"
} as const;

const DEFAULT_MODE: NeuralMode = "friend";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function normalizeUser(user: User): User {
  return {
    ...user,
    preferredMode: user.preferredMode ?? DEFAULT_MODE
  };
}

function normalizeThread(thread: ChatThread): ChatThread {
  return {
    ...thread,
    mode: thread.mode ?? DEFAULT_MODE,
    messages: Array.isArray(thread.messages) ? thread.messages : []
  };
}

export const storage = {
  getUsers: async () => {
    const users = await readJson<User[]>(KEYS.users, []);
    return users.map(normalizeUser);
  },
  saveUsers: (users: User[]) => writeJson(KEYS.users, users),
  getSession: () => readJson<AuthSession | null>(KEYS.session, null),
  saveSession: (session: AuthSession | null) =>
    session
      ? writeJson(KEYS.session, session)
      : AsyncStorage.removeItem(KEYS.session),
  getThreads: async () => {
    const threads = await readJson<ChatThread[]>(KEYS.chats, []);
    return threads.map(normalizeThread);
  },
  saveThreads: (threads: ChatThread[]) => writeJson(KEYS.chats, threads)
};
