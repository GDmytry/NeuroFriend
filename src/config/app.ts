import Constants from "expo-constants";

type AppExtra = {
  useMockAi?: boolean;
  aiApiUrl?: string;
  aiApiKey?: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
const aiApiUrl = normalizeString(extra.aiApiUrl);
const aiApiKey = normalizeString(extra.aiApiKey);

export const appConfig = {
  appName: Constants.expoConfig?.name ?? "Neuro Chat",
  useMockAi: extra.useMockAi !== false,
  aiApiUrl,
  aiApiKey,
  hasRemoteAi: aiApiUrl.length > 0
};
