const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const LOCAL_LLM_PRESETS = [
  { id: "ollama", label: "Ollama", provider: "ollama", baseUrl: "http://127.0.0.1:11434" },
  { id: "lmstudio", label: "LM Studio", provider: "openai", baseUrl: "http://127.0.0.1:1234" },
  { id: "llamacpp", label: "llama.cpp / LocalAI", provider: "openai", baseUrl: "http://127.0.0.1:8080" },
  { id: "vllm", label: "vLLM / MLX / OpenAI-compatible", provider: "openai", baseUrl: "http://127.0.0.1:8000" },
  { id: "jan", label: "Jan", provider: "openai", baseUrl: "http://127.0.0.1:1337" },
  { id: "kobold", label: "KoboldCPP / TextGen WebUI", provider: "openai", baseUrl: "http://127.0.0.1:5000" }
];

function loadEnvFile(pathname = join(__dirname, ".env")) {
  if (!existsSync(pathname)) {
    return;
  }

  const raw = readFileSync(pathname, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function stripTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeProvider(value) {
  const raw = String(value || "auto").trim().toLowerCase();

  if (raw === "ollama") {
    return "ollama";
  }

  if (["openai", "openai-compatible", "lmstudio", "llamacpp", "vllm", "mlx", "custom"].includes(raw)) {
    return "openai";
  }

  return "auto";
}

function normalizeBaseUrl(rawUrl) {
  let url = stripTrailingSlash(rawUrl);

  if (!url || url.toLowerCase() === "auto") {
    return "";
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  url = url.replace(/\/chat\/completions$/i, "");
  url = url.replace(/\/api\/chat$/i, "");
  url = url.replace(/\/api\/tags$/i, "");
  url = url.replace(/\/models$/i, "");

  return stripTrailingSlash(url);
}

function normalizeModelSetting(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed.toLowerCase() === "auto") {
    return "";
  }
  return trimmed;
}

function normalizeThink(value) {
  const normalized = String(value || "false").trim().toLowerCase();

  if (["low", "medium", "high"].includes(normalized)) {
    return normalized;
  }

  return normalized === "true";
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeTemperature(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const DEFAULT_SYSTEM_APPEND =
  "Пиши только на чистом грамотном русском языке, без иероглифов и без повторения одних и тех же фраз. Отвечай развернуто и содержательно: пиши примерно 5–15 предложений, раскрывай мысль подробно, с пояснениями, аргументами или живыми примерами. Не ограничивайся одним-двумя предложениями, если только пользователь сам прямо не попросил ответить кратко.";

function normalizeSystemAppend(value) {
  if (value === undefined) {
    return DEFAULT_SYSTEM_APPEND;
  }

  const trimmed = String(value).trim();
  if (!trimmed || ["off", "none", "false", "0"].includes(trimmed.toLowerCase())) {
    return "";
  }

  return trimmed;
}

function getServerConfig() {
  const configuredBaseUrl = normalizeBaseUrl(process.env.LLM_BASE_URL || process.env.OLLAMA_BASE_URL || "");
  const configuredModel = normalizeModelSetting(process.env.LLM_MODEL || process.env.OLLAMA_MODEL || "");

  return {
    host: (process.env.CHAT_SERVER_HOST || "0.0.0.0").trim(),
    port: normalizeNumber(process.env.CHAT_SERVER_PORT, 3001),
    apiKey: (process.env.CHAT_SERVER_API_KEY || "").trim(),
    enablePublicTunnel: normalizeBoolean(process.env.ENABLE_PUBLIC_TUNNEL, false),
    enableTailscaleServe: normalizeBoolean(process.env.ENABLE_TAILSCALE_SERVE, false),
    enableTailscaleFunnel: normalizeBoolean(process.env.ENABLE_TAILSCALE_FUNNEL, false),
    vpsSshTarget: (process.env.VPS_SSH_TARGET || "").trim(),
    vpsSshPort: normalizeNumber(process.env.VPS_SSH_PORT, 22),
    vpsSshKey: (process.env.VPS_SSH_KEY || "").trim(),
    vpsRemotePort: normalizeNumber(process.env.VPS_REMOTE_PORT, 3001),
    vpsPublicUrl: stripTrailingSlash(process.env.VPS_PUBLIC_URL || ""),
    llmProvider: normalizeProvider(process.env.LLM_PROVIDER),
    llmBaseUrl: configuredBaseUrl,
    llmModel: configuredModel,
    llmApiKey: (process.env.LLM_API_KEY || "").trim(),
    llmMaxTokens: normalizeNumber(process.env.LLM_MAX_TOKENS || process.env.OLLAMA_NUM_PREDICT, 1536),
    llmTemperature: normalizeTemperature(process.env.LLM_TEMPERATURE ?? process.env.OLLAMA_TEMPERATURE, 0.7),
    llmTimeoutMs: normalizeNumber(process.env.LLM_TIMEOUT_MS, 120_000),
    llmSystemAppend: normalizeSystemAppend(process.env.LLM_SYSTEM_APPEND),
    ollamaKeepAlive: (process.env.OLLAMA_KEEP_ALIVE || "10m").trim(),
    ollamaThink: normalizeThink(process.env.OLLAMA_THINK)
  };
}

function buildOllamaBaseUrl(baseUrl) {
  return stripTrailingSlash(baseUrl).replace(/\/v1$/i, "");
}

function buildOpenAiApiRoot(baseUrl) {
  const clean = stripTrailingSlash(baseUrl);
  return /\/v1$/i.test(clean) ? clean : `${clean}/v1`;
}

function buildUpstreamHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
  };
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 4_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function probeOllamaEndpoint(baseUrl, timeoutMs = 2_500) {
  const ollamaRoot = buildOllamaBaseUrl(baseUrl);
  const response = await fetchWithTimeout(`${ollamaRoot}/api/tags`, { method: "GET" }, timeoutMs);

  if (!response.ok) {
    throw new Error(`Ollama returned status ${response.status}`);
  }

  const payload = await response.json();
  const models = Array.isArray(payload?.models)
    ? payload.models.map((item) => String(item?.name || item?.model || "").trim()).filter(Boolean)
    : [];

  return {
    reachable: true,
    provider: "ollama",
    label: "Ollama",
    baseUrl: ollamaRoot,
    models
  };
}

async function probeOpenAiEndpoint(baseUrl, apiKey = "", timeoutMs = 2_500) {
  const apiRoot = buildOpenAiApiRoot(baseUrl);
  const response = await fetchWithTimeout(
    `${apiRoot}/models`,
    {
      method: "GET",
      headers: buildUpstreamHeaders(apiKey)
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`OpenAI-compatible endpoint returned status ${response.status}`);
  }

  const payload = await response.json();
  let models = [];

  if (Array.isArray(payload?.data)) {
    models = payload.data.map((item) => String(item?.id || item?.name || "").trim()).filter(Boolean);
  } else if (Array.isArray(payload?.models)) {
    models = payload.models
      .map((item) => String(item?.id || item?.name || item?.model || "").trim())
      .filter(Boolean);
  }

  return {
    reachable: true,
    provider: "openai",
    label: "OpenAI-compatible",
    baseUrl: stripTrailingSlash(baseUrl),
    models
  };
}

async function probeSpecificEndpoint(baseUrl, provider = "auto", apiKey = "", timeoutMs = 2_000) {
  if (provider === "ollama") {
    return probeOllamaEndpoint(baseUrl, timeoutMs);
  }

  if (provider === "openai") {
    return probeOpenAiEndpoint(baseUrl, apiKey, timeoutMs);
  }

  // Probe both formats in parallel so /health stays fast even on non-Ollama servers
  const preferOpenAi = /\/v1$/i.test(stripTrailingSlash(baseUrl));
  const [ollamaResult, openAiResult] = await Promise.allSettled([
    probeOllamaEndpoint(baseUrl, timeoutMs),
    probeOpenAiEndpoint(baseUrl, apiKey, timeoutMs)
  ]);

  const ordered = preferOpenAi ? [openAiResult, ollamaResult] : [ollamaResult, openAiResult];
  for (const outcome of ordered) {
    if (outcome.status === "fulfilled") {
      return outcome.value;
    }
  }

  const firstRejection = ordered.find((item) => item.status === "rejected");
  throw (firstRejection && firstRejection.reason) || new Error(`Could not connect to LLM at ${baseUrl}`);
}

async function scanLocalLlms(timeoutMs = 1_500) {
  const probes = await Promise.all(
    LOCAL_LLM_PRESETS.map(async (preset) => {
      try {
        const result = await probeSpecificEndpoint(preset.baseUrl, preset.provider, "", timeoutMs);
        return {
          ...result,
          id: preset.id,
          label: preset.label
        };
      } catch {
        return null;
      }
    })
  );

  return probes.filter(Boolean);
}

function scoreModelForAutoSelect(modelName) {
  const lower = String(modelName || "").toLowerCase();

  if (/embed|bge-|rerank|whisper|tts|moondream/.test(lower)) {
    return -100;
  }

  // Prefer newer multilingual chat models over legacy qwen 1.x (qwen:latest)
  if (lower.startsWith("qwen3.5")) return 100;
  if (lower.startsWith("qwen3")) return 95;
  if (lower.startsWith("qwen2.5")) return 90;
  if (lower.startsWith("gemma3") || lower.startsWith("llama3.3") || lower.startsWith("llama3.2") || lower.startsWith("llama3.1")) return 85;
  if (lower.startsWith("deepseek") || lower.startsWith("mistral") || lower.startsWith("phi4") || lower.startsWith("gemma2")) return 80;
  if (lower.startsWith("llama3") || lower.startsWith("qwen2")) return 75;
  if (/^qwen(:|$)/.test(lower)) return 10;

  return 50;
}

function resolveActiveModel(modelNames, requestedModel = "", configuredModel = "") {
  const candidates = Array.isArray(modelNames) ? modelNames.filter(Boolean) : [];
  const preferred = normalizeModelSetting(requestedModel) || normalizeModelSetting(configuredModel);

  if (candidates.length === 0) {
    return preferred || null;
  }

  if (preferred) {
    if (candidates.includes(preferred)) {
      return preferred;
    }

    const normalizedTarget = preferred.toLowerCase().replace(/\s+/g, "");
    const exactCi = candidates.find(
      (name) => String(name).toLowerCase().replace(/\s+/g, "") === normalizedTarget
    );
    if (exactCi) {
      return exactCi;
    }

    const prefixMatch = candidates.find((name) =>
      String(name).toLowerCase().startsWith(`${normalizedTarget}:`)
    );
    if (prefixMatch) {
      return prefixMatch;
    }
  }

  const ranked = [...candidates].sort((a, b) => scoreModelForAutoSelect(b) - scoreModelForAutoSelect(a));
  return ranked[0];
}

async function resolveLlmRuntime(config) {
  if (config.llmBaseUrl) {
    const probed = await probeSpecificEndpoint(
      config.llmBaseUrl,
      config.llmProvider,
      config.llmApiKey,
      3_000
    );
    const activeModel = resolveActiveModel(probed.models, "", config.llmModel);
    return {
      ...probed,
      activeModel,
      modelAvailable: Boolean(activeModel)
    };
  }

  const found = await scanLocalLlms(1_500);
  if (found.length === 0) {
    throw new Error(
      "Локальная LLM не найдена (проверены Ollama :11434, LM Studio :1234, llama.cpp :8080, vLLM/MLX :8000, Jan :1337, KoboldCPP :5000). Запустите модель или укажите LLM_BASE_URL в server/.env"
    );
  }

  const best = found.find((item) => item.models.length > 0) || found[0];
  const activeModel = resolveActiveModel(best.models, "", config.llmModel);

  return {
    ...best,
    activeModel,
    modelAvailable: Boolean(activeModel)
  };
}

function stripThinkingTags(text) {
  return String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "");
}

function extractOpenAiMessageText(choice) {
  const message = choice?.message;
  if (!message) {
    return "";
  }

  let content = "";
  if (typeof message.content === "string") {
    content = message.content;
  } else if (Array.isArray(message.content)) {
    content = message.content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }

  const cleaned = stripThinkingTags(content).trim();
  if (cleaned) {
    return cleaned;
  }

  if (typeof message.reasoning_content === "string" && message.reasoning_content.trim()) {
    return message.reasoning_content.trim();
  }

  return "";
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function sendOllamaChat(baseUrl, model, messages, config) {
  const ollamaRoot = buildOllamaBaseUrl(baseUrl);
  const response = await fetchWithTimeout(
    `${ollamaRoot}/api/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        keep_alive: config.ollamaKeepAlive,
        think: config.ollamaThink,
        options: {
          num_predict: config.llmMaxTokens,
          temperature: config.llmTemperature,
          repeat_penalty: 1.15
        }
      })
    },
    config.llmTimeoutMs
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    const error = new Error(
      `Ollama chat request failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`
    );
    error.upstreamStatus = response.status;
    throw error;
  }

  const data = await response.json();
  const rawContent = data?.message?.content || "";
  const reply = stripThinkingTags(rawContent).trim();

  if (!reply) {
    throw new Error("Ollama returned an empty chat response");
  }

  return {
    reply,
    model: data.model || model,
    provider: "ollama",
    totalDuration: data.total_duration || null,
    evalCount: data.eval_count || null
  };
}

async function sendOpenAiChat(baseUrl, model, messages, config) {
  const apiRoot = buildOpenAiApiRoot(baseUrl);
  const payload = {
    model: model || "local-model",
    messages,
    stream: false,
    temperature: config.llmTemperature,
    max_tokens: config.llmMaxTokens,
    frequency_penalty: 0.3
  };

  const response = await fetchWithTimeout(
    `${apiRoot}/chat/completions`,
    {
      method: "POST",
      headers: buildUpstreamHeaders(config.llmApiKey),
      body: JSON.stringify(payload)
    },
    config.llmTimeoutMs
  );

  if (!response.ok) {
    const errorText = await safeReadText(response);
    const error = new Error(
      `LLM chat request failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`
    );
    error.upstreamStatus = response.status;
    throw error;
  }

  const data = await response.json();
  const choice = Array.isArray(data?.choices) ? data.choices[0] : null;
  const reply = extractOpenAiMessageText(choice);

  if (!reply) {
    throw new Error("LLM returned an empty chat response");
  }

  return {
    reply,
    model: data.model || model || "local-model",
    provider: "openai",
    totalDuration: null,
    evalCount: data?.usage?.completion_tokens ?? null
  };
}

function applySystemPromptEnhancement(messages, config) {
  const list = Array.isArray(messages) ? messages.map((msg) => ({ ...msg })) : [];
  const extraInstruction = config.llmSystemAppend;

  if (!extraInstruction) {
    return list;
  }

  const systemIndex = list.findIndex((msg) => msg.role === "system");
  if (systemIndex !== -1) {
    const existing = String(list[systemIndex].content || "");
    if (!existing.includes("5–15 предложений") && !existing.includes(extraInstruction)) {
      list[systemIndex].content = `${existing.trim()}\n\n${extraInstruction}`;
    }
    return list;
  }

  return [{ role: "system", content: extraInstruction }, ...list];
}

async function sendChatCompletion(config, messages, requestedModel = "") {
  const preparedMessages = applySystemPromptEnhancement(messages, config);
  let runtime = null;

  if (!config.llmBaseUrl || config.llmProvider === "auto" || !resolveActiveModel([], requestedModel, config.llmModel)) {
    runtime = await resolveLlmRuntime(config);
  }

  const provider = runtime ? runtime.provider : config.llmProvider;
  const baseUrl = runtime ? runtime.baseUrl : config.llmBaseUrl;
  const availableModels = runtime ? runtime.models : [];
  let targetModel = resolveActiveModel(availableModels, requestedModel, config.llmModel);

  if (!targetModel && provider === "ollama") {
    throw new Error(
      "В Ollama не найдено ни одной установленной модели. Установите модель командой: ollama pull <model>"
    );
  }

  const execute = (modelToUse) =>
    provider === "ollama"
      ? sendOllamaChat(baseUrl, modelToUse, preparedMessages, config)
      : sendOpenAiChat(baseUrl, modelToUse, preparedMessages, config);

  try {
    return await execute(targetModel);
  } catch (error) {
    if (error && (error.upstreamStatus === 404 || error.upstreamStatus === 400)) {
      try {
        const refreshed = await probeSpecificEndpoint(baseUrl, provider, config.llmApiKey, 2_500);
        const fallbackModel = resolveActiveModel(refreshed.models, "", config.llmModel);
        if (fallbackModel && fallbackModel !== targetModel) {
          console.log(
            `[neuro-chat-server] Model "${targetModel || "auto"}" unavailable, falling back to "${fallbackModel}"`
          );
          return await execute(fallbackModel);
        }
      } catch {
        // Keep original error
      }
    }

    throw error;
  }
}

module.exports = {
  LOCAL_LLM_PRESETS,
  loadEnvFile,
  getServerConfig,
  probeSpecificEndpoint,
  scanLocalLlms,
  resolveActiveModel,
  resolveLlmRuntime,
  sendChatCompletion,
  stripThinkingTags,
  normalizeBaseUrl,
  normalizeProvider
};
