export type NeuralMode = "friend" | "coach" | "psychologist";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  preferredMode: NeuralMode;
  createdAt: string;
};

export type AuthSession = {
  userId: string;
};

export type MessageAuthor = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  author: MessageAuthor;
  text: string;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  title: string;
  mode: NeuralMode;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export type RegisteredUserInput = {
  name: string;
  email: string;
  password: string;
  preferredMode: NeuralMode;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SendMessageInput = {
  threadId?: string;
  text: string;
  mode: NeuralMode;
};

export type AiApiRole = "system" | "user" | "assistant";

export type AiApiMessage = {
  role: AiApiRole;
  content: string;
};

export type AiApiPayload = {
  mode: NeuralMode;
  systemPrompt: string;
  messages: AiApiMessage[];
};
