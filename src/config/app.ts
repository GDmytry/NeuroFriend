import Constants from "expo-constants";
import { Platform } from "react-native";

import tunnelConfig from "./tunnelUrl.json";

type AppExtra = {
  useMockAi?: boolean;
  aiApiUrl?: string;
  aiTailscaleUrl?: string;
  aiApiKey?: string;
};

export const DEFAULT_BRIDGE_PORT = 3001;
export const DEFAULT_TAILSCALE_CHAT_URL = "https://dmwind.taildbcf93.ts.net/chat";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export const ACTIVE_TUNNEL_CHAT_URL = normalizeString(tunnelConfig?.chatUrl);

function getExpoLanHost(): string {
  const hostUri = normalizeString(Constants.expoConfig?.hostUri);
  if (!hostUri) {
    return "";
  }

  const host = hostUri.split(":")[0]?.trim() || "";
  if (
    host &&
    !host.endsWith(".exp.direct") &&
    !host.endsWith(".expo.dev") &&
    (host === "localhost" || /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.)/.test(host))
  ) {
    return host;
  }

  return "";
}

export const FALLBACK_CHAT_URLS = [
  DEFAULT_TAILSCALE_CHAT_URL,
  ...(ACTIVE_TUNNEL_CHAT_URL ? [ACTIVE_TUNNEL_CHAT_URL] : []),
  ...(Platform.OS === "android" ? [`http://10.0.2.2:${DEFAULT_BRIDGE_PORT}/chat`] : []),
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

export function getAutoDetectedChatUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:${DEFAULT_BRIDGE_PORT}/chat`;
  }

  const expoHost = getExpoLanHost();
  if (expoHost) {
    return `http://${expoHost}:${DEFAULT_BRIDGE_PORT}/chat`;
  }

  if (ACTIVE_TUNNEL_CHAT_URL) {
    return normalizeChatApiUrl(ACTIVE_TUNNEL_CHAT_URL);
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_BRIDGE_PORT}/chat`;
  }

  return `http://localhost:${DEFAULT_BRIDGE_PORT}/chat`;
}

export function isPrivateLanUrl(url: string): boolean {
  return /^http:\/\/(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(url);
}

export function getCandidateChatUrls(primaryUrl?: string, secondaryUrl?: string): string[] {
  const result: string[] = [];
  const addUrl = (url: unknown) => {
    const normalized = normalizeChatApiUrl(url);
    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
  };

  // User-configured URLs always take top priority
  addUrl(primaryUrl);
  addUrl(secondaryUrl);

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    addUrl(`http://${window.location.hostname}:${DEFAULT_BRIDGE_PORT}/chat`);
  }

  const expoHost = getExpoLanHost();
  if (expoHost) {
    addUrl(`http://${expoHost}:${DEFAULT_BRIDGE_PORT}/chat`);
  }

  if (ACTIVE_TUNNEL_CHAT_URL && Platform.OS !== "web") {
    addUrl(ACTIVE_TUNNEL_CHAT_URL);
  }

  for (const fallback of FALLBACK_CHAT_URLS) {
    addUrl(fallback);
  }

  return result;
}

export function getCandidateBaseUrls(primaryUrl?: string, secondaryUrl?: string): string[] {
  return getCandidateChatUrls(primaryUrl, secondaryUrl)
    .map((chatUrl) => deriveServerBaseUrl(chatUrl))
    .filter(Boolean);
}

function detectRuntimeDefaultChatUrl(configuredUrl: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:${DEFAULT_BRIDGE_PORT}/chat`;
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  return getAutoDetectedChatUrl();
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
const configuredAiApiUrl = normalizeChatApiUrl(extra.aiApiUrl);
const aiApiUrl = detectRuntimeDefaultChatUrl(configuredAiApiUrl);
const aiTailscaleUrl =
  normalizeChatApiUrl(extra.aiTailscaleUrl) || DEFAULT_TAILSCALE_CHAT_URL;
const aiApiKey = normalizeString(extra.aiApiKey);

export const appConfig = {
  appName: Constants.expoConfig?.name ?? "Neuro Chat",
  useMockAi: extra.useMockAi === true,
  aiApiUrl,
  aiTailscaleUrl,
  aiApiKey,
  hasRemoteAi: aiApiUrl.length > 0 || aiTailscaleUrl.length > 0
};
