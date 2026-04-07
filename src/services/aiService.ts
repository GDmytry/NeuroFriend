import { appConfig } from "../config/app";
import { MODE_OPTIONS } from "../constants/modes";
import { AiApiMessage, AiApiPayload, ChatMessage, NeuralMode } from "../types";

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

const MODE_TONE_MAP = Object.fromEntries(
  MODE_OPTIONS.map((mode) => [mode.id, mode.promptHint])
) as Record<NeuralMode, string>;

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
    "Ты мобильный AI-ассистент внутри приложения Neuro Chat.",
    "Отвечай на русском языке, если пользователь пишет по-русски.",
    "Сохраняй естественный диалоговый тон и не теряй контекст переписки.",
    MODE_TONE_MAP[mode]
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
        content: message.text
      }))
    ]
  };
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
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = (await response.json()) as RemoteAiResponse;
    return data.reply?.trim() || data.message?.trim() || data.text?.trim() || null;
  } catch (error) {
    console.warn("Remote AI is unavailable. Falling back to mock reply.", error);
    return null;
  }
}

function buildMockReply({ mode, history, latestUserMessage }: GenerateReplyParams): string {
  const modeLabel = MODE_OPTIONS.find((item) => item.id === mode)?.title ?? mode;
  const previousUserMessages = history.filter((message) => message.author === "user").length;
  const trimmed = latestUserMessage.trim();

  const intros: Record<NeuralMode, string> = {
    friend: "Я рядом и постараюсь ответить по-дружески.",
    coach: "Давай разложим ситуацию по шагам и посмотрим, что можно сделать дальше.",
    psychologist: "Давай бережно разберём, что с тобой происходит."
  };

  const reflections: Record<NeuralMode, string> = {
    friend: `Похоже, для тебя это действительно важно: "${trimmed}".`,
    coach: `Твой запрос звучит так: "${trimmed}". Уже в этом есть хорошая точка для движения.`,
    psychologist: `Я слышу в твоих словах значимую для тебя тему: "${trimmed}".`
  };

  const followUps: Record<NeuralMode, string> = {
    friend: "Если хочешь, можем спокойно продолжить и разобрать это без формальностей.",
    coach: "Если готов, следующим сообщением можем превратить это в понятный план действий.",
    psychologist:
      "Если тебе комфортно, расскажи, что в этой ситуации ощущается самым тяжёлым прямо сейчас."
  };

  const contextLine =
    previousUserMessages > 1
      ? `Я помню контекст переписки и продолжаю разговор в режиме "${modeLabel}".`
      : `Это начало диалога в режиме "${modeLabel}", поэтому задам спокойный и понятный тон разговору.`;

  return [intros[mode], MODE_TONE_MAP[mode], reflections[mode], contextLine, followUps[mode]].join(
    " "
  );
}

export async function generateAssistantReply({
  mode,
  history,
  latestUserMessage
}: GenerateReplyParams): Promise<string> {
  const remoteReply = await getRemoteAssistantReply(buildAiPayload({ mode, history }));
  return remoteReply ?? buildMockReply({ mode, history, latestUserMessage });
}
