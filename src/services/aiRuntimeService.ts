import { appConfig } from "../config/app";
import { AiApiMessage, AiApiPayload, ChatAttachment, ChatMessage, NeuralMode } from "../types";

type GenerateReplyParams = {
  mode: NeuralMode;
  history: ChatMessage[];
  latestUserMessage: string;
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

export function buildSystemPrompt(mode: NeuralMode) {
  return [
    "Ты AI-ассистент внутри мобильного приложения Neuro Chat.",
    "Отвечай на русском языке, если пользователь пишет по-русски.",
    "Сохраняй естественный диалоговый тон и не теряй контекст переписки.",
    MODE_PROMPTS[mode]
  ].join(" ");
}

export function buildAiPayload({
  mode,
  history
}: Pick<GenerateReplyParams, "mode" | "history">): AiApiPayload {
  const systemPrompt = buildSystemPrompt(mode);

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

async function getRemoteAssistantReply(payload: AiApiPayload) {
  if (appConfig.useMockAi || !appConfig.hasRemoteAi) {
    return null;
  }

  try {
    const response = await fetch(appConfig.aiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(appConfig.aiApiKey ? { Authorization: `Bearer ${appConfig.aiApiKey}` } : {})
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

      throw new Error(`AI API returned ${response.status}${errorDetails ? `: ${errorDetails}` : ""}`);
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
    return "Сервер AI отклонил запрос. Проверьте aiApiKey в app.json и CHAT_SERVER_API_KEY в server/.env.";
  }

  if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
    return "Node-сервер доступен, но не может подключиться к Ollama на 127.0.0.1:11434. Проверьте, что Ollama запущена и локальный API отвечает.";
  }

  if (message.includes("timed out")) {
    return "Сервер AI не ответил вовремя. Если вы прикрепили файл, попробуйте меньший текст или разделите его на части.";
  }

  if (message.includes("Network request failed")) {
    return "Приложение не может подключиться к серверу AI. Проверьте IP-адрес в app.json, Wi-Fi и Windows Firewall.";
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

function buildMockReply({ mode, latestUserMessage }: GenerateReplyParams): string {
  const modeOpeners: Record<NeuralMode, string> = {
    friend: "Я рядом и отвечу по-дружески.",
    coach: "Давайте разложим это на понятные шаги.",
    psychologist: "Давайте спокойно и бережно разберем, что с вами происходит."
  };

  return [modeOpeners[mode], MODE_PROMPTS[mode], `Ваш запрос: "${latestUserMessage.trim()}".`].join(
    " "
  );
}

export async function generateAssistantReply({
  mode,
  history,
  latestUserMessage
}: GenerateReplyParams): Promise<string> {
  if (appConfig.useMockAi || !appConfig.hasRemoteAi) {
    return buildMockReply({ mode, history, latestUserMessage });
  }

  const remoteReply = await getRemoteAssistantReply(buildAiPayload({ mode, history }));

  if (!remoteReply) {
    throw new Error("AI сервер вернул пустой ответ.");
  }

  return remoteReply;
}
