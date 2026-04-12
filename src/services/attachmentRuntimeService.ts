import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { ChatAttachment } from "../types";
import { createId } from "../utils/id";

const MAX_ATTACHMENT_BYTES = 24 * 1024;
const MAX_ATTACHMENT_CHARACTERS = 6_000;

const SUPPORTED_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "xml",
  "yml",
  "yaml",
  "log",
  "html",
  "htm"
]);

const SUPPORTED_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "application/yaml",
  "text/yaml",
  "text/html"
]);

export async function pickTextAttachments() {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: ["text/*", "application/json", "application/xml", "text/xml", "application/yaml"]
  });

  if (result.canceled) {
    return [];
  }

  return Promise.all(result.assets.map(readPickedAttachment));
}

async function readPickedAttachment(
  asset: DocumentPicker.DocumentPickerAsset
): Promise<ChatAttachment> {
  validateAsset(asset);

  const rawText = await FileSystem.readAsStringAsync(asset.uri);
  const textContent = normalizeText(rawText);

  if (!textContent) {
    throw new Error(`Файл "${asset.name}" пустой или не содержит читаемого текста.`);
  }

  const truncatedText =
    textContent.length > MAX_ATTACHMENT_CHARACTERS
      ? `${textContent.slice(0, MAX_ATTACHMENT_CHARACTERS)}\n\n[Файл был сокращен приложением, чтобы локальная модель успела его обработать.]`
      : textContent;

  return {
    id: createId(),
    name: asset.name,
    uri: asset.uri,
    mimeType: normalizeMimeType(asset.mimeType, asset.name),
    size: typeof asset.size === "number" ? asset.size : truncatedText.length,
    textContent: truncatedText
  };
}

function validateAsset(asset: DocumentPicker.DocumentPickerAsset) {
  const extension = getExtension(asset.name);
  const mimeType = normalizeMimeType(asset.mimeType, asset.name);

  const supportedByMime = mimeType.startsWith("text/") || SUPPORTED_MIME_TYPES.has(mimeType);
  const supportedByExtension = extension ? SUPPORTED_EXTENSIONS.has(extension) : false;

  if (!supportedByMime && !supportedByExtension) {
    throw new Error(
      `Файл "${asset.name}" не поддерживается. Пока можно прикреплять только текстовые файлы: .txt, .md, .csv, .json, .xml, .yml, .yaml, .log, .html.`
    );
  }

  if (typeof asset.size === "number" && asset.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Файл "${asset.name}" слишком большой. Для отправки в локальную модель сейчас лучше использовать текстовые файлы до ${Math.round(
        MAX_ATTACHMENT_BYTES / 1024
      )} КБ.`
    );
  }
}

function getExtension(name: string) {
  const match = /\.([^.]+)$/.exec(name);
  return match ? match[1].toLowerCase() : "";
}

function normalizeMimeType(mimeType: string | null | undefined, name: string) {
  if (typeof mimeType === "string" && mimeType.trim()) {
    return mimeType.trim().toLowerCase();
  }

  const extension = getExtension(name);

  switch (extension) {
    case "json":
      return "application/json";
    case "xml":
      return "application/xml";
    case "csv":
      return "text/csv";
    case "yml":
    case "yaml":
      return "application/yaml";
    case "md":
    case "markdown":
      return "text/markdown";
    case "html":
    case "htm":
      return "text/html";
    default:
      return "text/plain";
  }
}

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "").trim();
}
