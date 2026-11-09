import { appConfig, deriveServerBaseUrl, getCandidateBaseUrls } from "../config/app";
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

export type ServerHealthStatus = {
  ok: boolean;
  reachable: boolean;
  baseUrl: string;
  ollamaReachable?: boolean;
  ollamaModel?: string;
  modelAvailable?: boolean;
  installedModels?: string[];
  lanChatUrls?: string[];
  publicChatUrl?: string | null;
  error?: string | null;
};

type ServerRuntimeConfig = {
  enabled: boolean;
  baseUrl: string;
  candidateBaseUrls: string[];
  apiKey: string;
};

const REQUEST_TIMEOUT_MS = 6_000;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getRuntimeServerConfig(): Promise<ServerRuntimeConfig> {
  const settings = await storage.getSettings();
  const aiApiUrl = normalizeString(settings.remoteAiUrl || appConfig.aiApiUrl);
  const aiApiKey = normalizeString(settings.remoteAiKey || appConfig.aiApiKey);
  const candidateBaseUrls = getCandidateBaseUrls(aiApiUrl);
  const baseUrl = candidateBaseUrls[0] || deriveServerBaseUrl(aiApiUrl);
  const remoteAiEnabled =
    typeof settings.remoteAiEnabled === "boolean"
      ? settings.remoteAiEnabled
      : appConfig.hasRemoteAi && !appConfig.useMockAi;

  return {
    enabled: remoteAiEnabled && baseUrl.length > 0,
    baseUrl,
    candidateBaseUrls,
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

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await fetch(url, {
      ...init,
      ...(controller ? { signal: controller.signal } : {})
    });
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function toUserFacingServerError(message: string, baseUrl: string) {
  if (message.includes("Invalid email or password")) {
    return "Неверный email или пароль";
  }

  if (message.includes("already exists")) {
    return "Пользователь с таким email уже существует";
  }

  if (message.includes("at least 6 characters")) {
    return "Пароль должен содержать минимум 6 символов";
  }

  if (message === "Unauthorized" || message.includes("401")) {
    return "Сервер отклонил запрос (401). Проверьте Bearer token в настройках сервера.";
  }

  if (
    message.includes("Network request failed") ||
    message.includes("Failed to fetch") ||
    message.includes("aborted") ||
    message.includes("AbortError")
  ) {
    return `Не удалось подключиться к серверу (${baseUrl}). Убедитесь, что сервер запущен на ПК и адрес указан верно в настройках.`;
  }

  return message;
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

  const urlsToTry = config.candidateBaseUrls.length
    ? config.candidateBaseUrls
    : [config.baseUrl];

  let lastNetworkError: unknown = null;

  for (const baseUrl of urlsToTry) {
    let response: Response;

    try {
      response = await fetchWithTimeout(`${baseUrl}${pathname}`, {
        method: options.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          ...(options.sessionToken ? { "X-Session-Token": options.sessionToken } : {})
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
    } catch (error) {
      lastNetworkError = error;
      continue;
    }

    if (response.status >= 502 && response.status <= 504 && urlsToTry.length > 1) {
      lastNetworkError = new Error(`Request failed with status ${response.status}`);
      continue;
    }

    if (!response.ok) {
      const errorText = await readErrorText(response);
      const rawMsg = errorText || `Request failed with status ${response.status}`;
      throw new Error(toUserFacingServerError(rawMsg, baseUrl));
    }

    return (await response.json()) as T;
  }

  const rawMsg =
    lastNetworkError instanceof Error ? lastNetworkError.message : "Network request failed";
  throw new Error(toUserFacingServerError(rawMsg, config.baseUrl));
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

export async function checkServerHealth(customUrl?: string): Promise<ServerHealthStatus> {
  const config = await getRuntimeServerConfig();
  const urlsToTry = customUrl
    ? getCandidateBaseUrls(customUrl)
    : config.candidateBaseUrls;

  if (!urlsToTry.length) {
    return {
      ok: false,
      reachable: false,
      baseUrl: "",
      error: "Адрес сервера не указан"
    };
  }

  let lastError = "Network request failed";
  const primaryBaseUrl = customUrl ? deriveServerBaseUrl(customUrl) : config.baseUrl;

  for (const baseUrl of urlsToTry) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/health`, { method: "GET" }, 4_000);
      if (!response.ok && response.status !== 503) {
        lastError = `Status ${response.status}`;
        continue;
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        ollamaReachable?: boolean;
        ollamaModel?: string;
        modelAvailable?: boolean;
        installedModels?: string[];
        lanChatUrls?: string[];
        publicChatUrl?: string | null;
        error?: string | null;
      };

      return {
        ok: Boolean(payload.ok),
        reachable: true,
        baseUrl,
        ollamaReachable: payload.ollamaReachable,
        ollamaModel: payload.ollamaModel,
        modelAvailable: payload.modelAvailable,
        installedModels: payload.installedModels,
        lanChatUrls: payload.lanChatUrls,
        publicChatUrl: payload.publicChatUrl,
        error: payload.error ?? null
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Network request failed";
    }
  }

  return {
    ok: false,
    reachable: false,
    baseUrl: primaryBaseUrl,
    error: toUserFacingServerError(lastError, primaryBaseUrl)
  };
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
