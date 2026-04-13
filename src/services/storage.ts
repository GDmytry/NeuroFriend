import AsyncStorage from "@react-native-async-storage/async-storage";

import { appConfig } from "../config/app";
import {
  AppSettings,
  AuthSession,
  ChatAttachment,
  ChatMessage,
  ChatThread,
  NeuralMode,
  User
} from "../types";

const KEYS = {
  users: "neuro-chat/users",
  session: "neuro-chat/session",
  chats: "neuro-chat/chats",
  settings: "neuro-chat/settings"
} as const;

const DEFAULT_MODE: NeuralMode = "friend";
const DEFAULT_SETTINGS: AppSettings = {
  themePreference: "system",
  remoteAiEnabled: appConfig.hasRemoteAi && !appConfig.useMockAi,
  remoteAiUrl: appConfig.aiApiUrl,
  remoteAiKey: appConfig.aiApiKey
};

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
    preferredMode: user.preferredMode ?? DEFAULT_MODE,
    assistantName:
      typeof user.assistantName === "string" && user.assistantName.trim()
        ? user.assistantName.trim()
        : "NeuroFriend"
  };
}

function normalizeAttachment(attachment: ChatAttachment): ChatAttachment {
  return {
    id: attachment.id,
    name: attachment.name ?? "text-file.txt",
    uri: attachment.uri ?? "",
    mimeType: attachment.mimeType ?? "text/plain",
    size: typeof attachment.size === "number" ? attachment.size : 0,
    textContent: typeof attachment.textContent === "string" ? attachment.textContent : ""
  };
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    text: typeof message.text === "string" ? message.text : "",
    attachments: Array.isArray(message.attachments)
      ? message.attachments.map(normalizeAttachment)
      : []
  };
}

function normalizeThread(thread: ChatThread): ChatThread {
  return {
    ...thread,
    mode: thread.mode ?? DEFAULT_MODE,
    messages: Array.isArray(thread.messages) ? thread.messages.map(normalizeMessage) : []
  };
}

function normalizeSettings(settings: AppSettings | null | undefined): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {})
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
  saveThreads: (threads: ChatThread[]) => writeJson(KEYS.chats, threads),
  getSettings: async () => {
    const settings = await readJson<AppSettings | null>(KEYS.settings, null);
    return normalizeSettings(settings);
  },
  saveSettings: (settings: AppSettings) => writeJson(KEYS.settings, normalizeSettings(settings))
};
