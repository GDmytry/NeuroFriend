import { appConfig } from "../config/app";
import { storage } from "./storage";
import { AiApiMessage, AiApiPayload, ChatAttachment, ChatMessage, NeuralMode } from "../types";

type GenerateReplyParams = {
  mode: NeuralMode;
  history: ChatMessage[];
  latestUserMessage: string;
  assistantName: string;
};

type RemoteAiResponse = {
  reply?: string;
  message?: string;
  text?: string;
};

const MODE_PROMPTS: Record<NeuralMode, string> = {
  friend: "Отвечай тепло, просто и по-дружески, без лишней формальности.",
  coach: "Отвечай структурно, поддерживающе и с фокусом на действия и цели.",
  psychologist:
    "Отвечай бережно, спокойно и эмпатично, без давления, диагнозов и категоричных выводов."
};

const MAX_ATTACHMENT_CONTEXT_PER_FILE = 3_000;

function toApiRole(author: ChatMessage["author"]): AiApiMessage["role"] {
  if (author === "user") {
    return "user";
  }

  if (author === "assistant") {
    return "assistant";
  }

  return "system";
}

export function buildSystemPrompt(mode: NeuralMode, assistantName: string) {
  return [
    `Твое имя: ${assistantName}. Представляйся именно так, если пользователь спросит, как тебя зовут.`,
    "Ты AI-ассистент внутри мобильного приложения NeuroFriend.",
    "Отвечай на русском языке, если пользователь пишет по-русски.",
    "Сохраняй естественный диалоговый тон и не теряй контекст переписки.",
    MODE_PROMPTS[mode]
  ].join(" ");
}

export function buildAiPayload({
  mode,
  history,
  assistantName
}: Pick<GenerateReplyParams, "mode" | "history" | "assistantName">): AiApiPayload {
  const systemPrompt = buildSystemPrompt(mode, assistantName);

  return {
    mode,
    systemPrompt,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((message) => ({
        role: toApiRole(message.author),
        content: toApiContent(message)
      }))
    ]
  };
}

function toApiContent(message: ChatMessage) {
  if (message.author !== "user" || !message.attachments?.length) {
    return message.text;
  }

  return buildUserMessageWithAttachments(message.text, message.attachments);
}

function buildUserMessageWithAttachments(text: string, attachments: ChatAttachment[]) {
  const intro = text.trim()
    ? `Комментарий пользователя:\n${text.trim()}`
    : "Пользователь отправил только текстовые файлы без отдельного комментария.";

  const compactFilesBlock = attachments
    .map((attachment, index) =>
      [
        `[Файл ${index + 1}] ${attachment.name}`,
        `Тип: ${attachment.mimeType || "text/plain"}`,
        "Содержимое:",
        attachment.textContent.slice(0, MAX_ATTACHMENT_CONTEXT_PER_FILE)
      ].join("\n")
    )
    .join("\n\n");

  return [
    intro,
    "Ниже приложены текстовые файлы. Используй их как основной контекст для ответа.",
    "Если пользователь просит пересказ или анализ файла, ответь кратко и по существу, без длинных вступлений.",
    compactFilesBlock
  ].join("\n\n");
}

async function getRuntimeAiConfig() {
  const settings = await storage.getSettings();
  const aiApiUrl = normalizeString(settings.remoteAiUrl || appConfig.aiApiUrl);
  const aiApiKey = normalizeString(settings.remoteAiKey || appConfig.aiApiKey);
  const remoteAiEnabled =
    typeof settings.remoteAiEnabled === "boolean"
      ? settings.remoteAiEnabled
      : appConfig.hasRemoteAi && !appConfig.useMockAi;

  return {
    aiApiUrl,
    aiApiKey,
    useMockAi: !remoteAiEnabled,
    hasRemoteAi: remoteAiEnabled && aiApiUrl.length > 0
  };
}

async function getRemoteAssistantReply(payload: AiApiPayload) {
  const runtimeConfig = await getRuntimeAiConfig();

  if (runtimeConfig.useMockAi || !runtimeConfig.hasRemoteAi) {
    return null;
  }

  try {
    const response = await fetch(runtimeConfig.aiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(runtimeConfig.aiApiKey
          ? { Authorization: `Bearer ${runtimeConfig.aiApiKey}` }
          : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorDetails = await readRemoteErrorMessage(response);

      if (response.status === 401) {
        throw new Error(
          `AI API returned 401${errorDetails ? `: ${errorDetails}` : ""}. Check aiApiKey in app.json against CHAT_SERVER_API_KEY in server/.env`
        );
      }

      throw new Error(
        `AI API returned ${response.status}${errorDetails ? `: ${errorDetails}` : ""}`
      );
    }

    const data = (await response.json()) as RemoteAiResponse;
    return data.reply?.trim() || data.message?.trim() || data.text?.trim() || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected remote AI error";
    console.warn("Remote AI request failed.", error);
    throw new Error(toUserFacingRemoteAiError(message));
  }
}

function toUserFacingRemoteAiError(message: string) {
  if (message.includes("401")) {
    return "Сервер AI отклонил запрос. Проверьте aiApiKey в настройках приложения и CHAT_SERVER_API_KEY на сервере.";
  }

  if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
    return "Node-сервер доступен, но не может подключиться к Ollama на 127.0.0.1:11434. Проверьте, что Ollama запущена и локальный API отвечает.";
  }

  if (message.includes("timed out")) {
    return "Сервер AI не ответил вовремя. Если вы прикрепили файл, попробуйте меньший текст или разделите его на части.";
  }

  if (message.includes("Network request failed")) {
    return "Приложение не может подключиться к серверу AI. Проверьте публичный HTTPS-адрес, токен и доступность туннеля.";
  }

  return `Ошибка подключения к AI: ${message}`;
}

async function readRemoteErrorMessage(response: Response) {
  try {
    const raw = await response.text();

    if (!raw.trim()) {
      return "";
    }

    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      return parsed.error?.trim() || parsed.message?.trim() || raw.trim();
    } catch {
      return raw.trim();
    }
  } catch {
    return "";
  }
}

function buildMockReply({ mode, latestUserMessage, assistantName }: GenerateReplyParams): string {
  const modeOpeners: Record<NeuralMode, string> = {
    friend: `${assistantName} рядом и отвечает по-дружески.`,
    coach: `${assistantName} поможет разложить это на понятные шаги.`,
    psychologist: `${assistantName} бережно поможет разобраться в ситуации.`
  };

  return [modeOpeners[mode], MODE_PROMPTS[mode], `Ваш запрос: "${latestUserMessage.trim()}".`].join(
    " "
  );
}

export async function generateAssistantReply({
  mode,
  history,
  latestUserMessage,
  assistantName
}: GenerateReplyParams): Promise<string> {
  const runtimeConfig = await getRuntimeAiConfig();

  if (runtimeConfig.useMockAi || !runtimeConfig.hasRemoteAi) {
    return buildMockReply({ mode, history, latestUserMessage, assistantName });
  }

  const remoteReply = await getRemoteAssistantReply(
    buildAiPayload({ mode, history, assistantName })
  );

  if (!remoteReply) {
    throw new Error("AI сервер вернул пустой ответ.");
  }

  return remoteReply;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
