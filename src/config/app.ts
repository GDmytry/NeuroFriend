import Constants from "expo-constants";
import { Platform } from "react-native";

import tunnelConfig from "./tunnelUrl.json";

type AppExtra = {
  useMockAi?: boolean;
  aiApiUrl?: string;
  aiApiKey?: string;
};

const DEFAULT_BRIDGE_PORT = 3001;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export const ACTIVE_TUNNEL_CHAT_URL = normalizeString(tunnelConfig?.chatUrl);

export const FALLBACK_CHAT_URLS = [
  ...(ACTIVE_TUNNEL_CHAT_URL ? [ACTIVE_TUNNEL_CHAT_URL] : []),
  `http://192.168.3.145:${DEFAULT_BRIDGE_PORT}/chat`,
  "https://nelinux.taildbcf93.ts.net/chat",
  `http://localhost:${DEFAULT_BRIDGE_PORT}/chat`,
  `http://127.0.0.1:${DEFAULT_BRIDGE_PORT}/chat`
];

export function normalizeChatApiUrl(value: unknown): string {
  let raw = normalizeString(value);

  if (!raw) {
    return "";
  }

  if (!/^https?:\/\//i.test(raw)) {
    const isLocalOrIp =
      /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(raw) ||
      /:\d+(\/|$)/.test(raw);
    raw = `${isLocalOrIp ? "http" : "https"}://${raw}`;
  }

  raw = raw.replace(/\/+$/, "");

  if (raw.endsWith("/health")) {
    return `${raw.slice(0, -"/health".length)}/chat`;
  }

  if (!raw.endsWith("/chat")) {
    return `${raw}/chat`;
  }

  return raw;
}

export function deriveServerBaseUrl(value: unknown): string {
  const chatUrl = normalizeChatApiUrl(value);

  if (!chatUrl) {
    return "";
  }

  return chatUrl.endsWith("/chat") ? chatUrl.slice(0, -"/chat".length) : chatUrl;
}

export function getCandidateChatUrls(primaryUrl?: string): string[] {
  const result: string[] = [];
  const addUrl = (url: unknown) => {
    const normalized = normalizeChatApiUrl(url);
    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
  };

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    addUrl(`http://${host}:${DEFAULT_BRIDGE_PORT}/chat`);
  }

  if (ACTIVE_TUNNEL_CHAT_URL && Platform.OS !== "web") {
    addUrl(ACTIVE_TUNNEL_CHAT_URL);
  }

  addUrl(primaryUrl);

  const hostUri = normalizeString(Constants.expoConfig?.hostUri);
  if (hostUri) {
    const host = hostUri.split(":")[0]?.trim();
    if (
      host &&
      !host.endsWith(".exp.direct") &&
      !host.endsWith(".expo.dev") &&
      (host === "localhost" || /^(192\.168\.|10\.|172\.|127\.)/.test(host))
    ) {
      addUrl(`http://${host}:${DEFAULT_BRIDGE_PORT}/chat`);
    }
  }

  for (const fallback of FALLBACK_CHAT_URLS) {
    addUrl(fallback);
  }

  return result;
}

export function getCandidateBaseUrls(primaryUrl?: string): string[] {
  return getCandidateChatUrls(primaryUrl)
    .map((chatUrl) => deriveServerBaseUrl(chatUrl))
    .filter(Boolean);
}

function detectRuntimeDefaultChatUrl(configuredUrl: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:${DEFAULT_BRIDGE_PORT}/chat`;
  }

  if (ACTIVE_TUNNEL_CHAT_URL) {
    return normalizeChatApiUrl(ACTIVE_TUNNEL_CHAT_URL);
  }

  const candidates = getCandidateChatUrls(configuredUrl);
  return candidates[0] || `http://192.168.3.145:${DEFAULT_BRIDGE_PORT}/chat`;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
const configuredAiApiUrl = normalizeChatApiUrl(extra.aiApiUrl);
const aiApiUrl = detectRuntimeDefaultChatUrl(configuredAiApiUrl);
const aiApiKey = normalizeString(extra.aiApiKey);

export const appConfig = {
  appName: Constants.expoConfig?.name ?? "Neuro Chat",
  useMockAi: extra.useMockAi === true,
  aiApiUrl,
  aiApiKey,
  hasRemoteAi: aiApiUrl.length > 0
};
