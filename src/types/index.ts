export type NeuralMode = "friend" | "coach" | "psychologist";
export type ThemePreference = "system" | "light" | "dark";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  preferredMode: NeuralMode;
  assistantName: string;
  createdAt: string;
};

export type AuthSession = {
  userId: string;
  token?: string;
  authMode?: "local" | "server";
};

export type MessageAuthor = "user" | "assistant" | "system";

export type ChatAttachment = {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  size: number;
  textContent: string;
};

export type ChatMessage = {
  id: string;
  author: MessageAuthor;
  text: string;
  createdAt: string;
  attachments?: ChatAttachment[];
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
  assistantName: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SendMessageInput = {
  threadId?: string;
  text: string;
  mode: NeuralMode;
  attachments?: ChatAttachment[];
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

export type AppSettings = {
  themePreference: ThemePreference;
  remoteAiEnabled: boolean;
  remoteAiUrl: string;
  remoteAiKey: string;
};
