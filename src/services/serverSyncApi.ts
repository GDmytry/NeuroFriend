import { appConfig } from "../config/app";
import { storage } from "./storage";
import {
  ChatThread,
  LoginInput,
  NeuralMode,
  RegisteredUserInput,
  User
} from "../types";

type RemoteUser = Omit<User, "password"> & {
  password?: string;
};

type AuthResponse = {
  ok: boolean;
  user: RemoteUser;
  sessionToken: string;
  threads?: ChatThread[];
};

type SessionResponse = {
  ok: boolean;
  user: RemoteUser;
  threads: ChatThread[];
};

type ThreadsResponse = {
  ok: boolean;
  threads: ChatThread[];
};

type SaveThreadResponse = {
  ok: boolean;
  thread: ChatThread;
};

type ServerRuntimeConfig = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function deriveBaseUrl(value: string) {
  const normalized = normalizeString(value).replace(/\/+$/, "");

  if (!normalized) {
    return "";
  }

  return normalized.endsWith("/chat") ? normalized.slice(0, -5) : normalized;
}

async function getRuntimeServerConfig(): Promise<ServerRuntimeConfig> {
  const settings = await storage.getSettings();
  const aiApiUrl = normalizeString(settings.remoteAiUrl || appConfig.aiApiUrl);
  const aiApiKey = normalizeString(settings.remoteAiKey || appConfig.aiApiKey);
  const baseUrl = deriveBaseUrl(aiApiUrl);

  return {
    enabled: baseUrl.length > 0,
    baseUrl,
    apiKey: aiApiKey
  };
}

function toClientUser(user: RemoteUser, password = ""): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password,
    preferredMode: user.preferredMode,
    assistantName: user.assistantName,
    createdAt: user.createdAt
  };
}

async function requestJson<T>(
  pathname: string,
  options: {
    method?: string;
    body?: unknown;
    sessionToken?: string;
  } = {}
): Promise<T> {
  const config = await getRuntimeServerConfig();

  if (!config.enabled) {
    throw new Error("Server sync is not configured");
  }

  const response = await fetch(`${config.baseUrl}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...(options.sessionToken ? { "X-Session-Token": options.sessionToken } : {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (!response.ok) {
    const errorText = await readErrorText(response);
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function readErrorText(response: Response) {
  try {
    const raw = await response.text();

    if (!raw.trim()) {
      return "";
    }

    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      return normalizeString(parsed.error || parsed.message || raw);
    } catch {
      return raw.trim();
    }
  } catch {
    return "";
  }
}

export async function hasServerSync() {
  const config = await getRuntimeServerConfig();
  return config.enabled;
}

export async function loginWithServer(input: LoginInput) {
  const data = await requestJson<AuthResponse>("/auth/login", {
    method: "POST",
    body: input
  });

  return {
    user: toClientUser(data.user, input.password),
    sessionToken: data.sessionToken,
    threads: data.threads ?? []
  };
}

export async function registerWithServer(input: RegisteredUserInput) {
  const data = await requestJson<AuthResponse>("/auth/register", {
    method: "POST",
    body: input
  });

  return {
    user: toClientUser(data.user, input.password),
    sessionToken: data.sessionToken,
    threads: data.threads ?? []
  };
}

export async function resumeServerSession(sessionToken: string) {
  const data = await requestJson<SessionResponse>("/auth/session", {
    sessionToken
  });

  return {
    user: toClientUser(data.user),
    threads: data.threads
  };
}

export async function updateServerUser(
  sessionToken: string,
  patch: { preferredMode?: NeuralMode; assistantName?: string }
) {
  const data = await requestJson<{ ok: boolean; user: RemoteUser }>("/auth/me", {
    method: "PATCH",
    sessionToken,
    body: patch
  });

  return toClientUser(data.user);
}

export async function fetchServerThreads(sessionToken: string) {
  const data = await requestJson<ThreadsResponse>("/threads", {
    sessionToken
  });
  return data.threads;
}

export async function saveServerThread(sessionToken: string, thread: ChatThread) {
  const data = await requestJson<SaveThreadResponse>(`/threads/${encodeURIComponent(thread.id)}`, {
    method: "PUT",
    sessionToken,
    body: { thread }
  });

  return data.thread;
}

export async function deleteServerThread(sessionToken: string, threadId: string) {
  await requestJson<{ ok: boolean }>(`/threads/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
    sessionToken
  });
}

export async function syncServerThreads(sessionToken: string, threads: ChatThread[]) {
  const data = await requestJson<ThreadsResponse>("/threads/sync", {
    method: "POST",
    sessionToken,
    body: { threads }
  });

  return data.threads;
}
