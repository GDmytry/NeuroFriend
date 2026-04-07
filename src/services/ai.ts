import { MODE_OPTIONS } from "../constants/modes";
import { ChatMessage, NeuralMode } from "../types";

type GenerateReplyParams = {
  mode: NeuralMode;
  history: ChatMessage[];
  latestUserMessage: string;
};

const MODE_TONE_MAP = Object.fromEntries(
  MODE_OPTIONS.map((mode) => [mode.id, mode.promptHint])
) as Record<NeuralMode, string>;

export async function generateAssistantReply({
  mode,
  history,
  latestUserMessage
}: GenerateReplyParams): Promise<string> {
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
    psychologist: "Если тебе комфортно, расскажи, что в этой ситуации ощущается самым тяжёлым прямо сейчас."
  };

  const contextLine =
    previousUserMessages > 1
      ? `Я помню контекст переписки и продолжаю разговор в режиме "${modeLabel}".`
      : `Это начало диалога в режиме "${modeLabel}", поэтому задам спокойный и понятный тон разговору.`;

  return [intros[mode], MODE_TONE_MAP[mode], reflections[mode], contextLine, followUps[mode]].join(
    " "
  );
}
