const { createServer } = require("node:http");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

loadEnvFile(join(__dirname, ".env"));

const config = {
  host: process.env.CHAT_SERVER_HOST || "0.0.0.0",
  port: Number(process.env.CHAT_SERVER_PORT || 3001),
  apiKey: (process.env.CHAT_SERVER_API_KEY || "").trim(),
  ollamaBaseUrl: stripTrailingSlash(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"),
  ollamaModel: (process.env.OLLAMA_MODEL || "qwen3:8b").trim(),
  ollamaKeepAlive: (process.env.OLLAMA_KEEP_ALIVE || "10m").trim(),
  ollamaThink: normalizeThink(process.env.OLLAMA_THINK),
  ollamaNumPredict: Number(process.env.OLLAMA_NUM_PREDICT || 220),
  ollamaTemperature: Number(process.env.OLLAMA_TEMPERATURE || 0.2)
};

const server = createServer(async (request, response) => {
  try {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/") {
      sendJson(response, 200, {
        name: "neuro-chat-ollama-bridge",
        ok: true,
        health: "/health",
        chat: "/chat"
      });
      return;
    }

    if (url.pathname === "/health" && request.method === "GET") {
      await handleHealth(response);
      return;
    }

    if (url.pathname === "/chat" && request.method === "POST") {
      const requestStartedAt = Date.now();
      const clientAddress = request.socket.remoteAddress || "unknown";
      console.log(`[neuro-chat-server] Incoming /chat request from ${clientAddress}`);

      if (!isAuthorized(request)) {
        console.warn(`[neuro-chat-server] Unauthorized /chat request from ${clientAddress}`);
        sendJson(response, 401, {
          ok: false,
          error: "Unauthorized"
        });
        return;
      }

      const body = await readJsonBody(request);
      await handleChat(body, response, {
        clientAddress,
        requestStartedAt
      });
      return;
    }

    sendJson(response, 404, {
      ok: false,
      error: "Not found"
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: getErrorMessage(error)
    });
  }
});

server.listen(config.port, config.host, () => {
  console.log(
    `[neuro-chat-server] Listening on http://${config.host}:${config.port} -> ${config.ollamaBaseUrl}`
  );
  console.log(`[neuro-chat-server] Model: ${config.ollamaModel}`);
  console.log(
    `[neuro-chat-server] Auth: ${config.apiKey ? "Bearer token enabled" : "disabled"}`
  );
});

async function handleHealth(response) {
  try {
    const tagsResponse = await fetch(`${config.ollamaBaseUrl}/api/tags`);

    if (!tagsResponse.ok) {
      throw new Error(`Ollama tags request failed with status ${tagsResponse.status}`);
    }

    const tagsPayload = await tagsResponse.json();
    const modelNames = Array.isArray(tagsPayload.models)
      ? tagsPayload.models.map((item) => item.name)
      : [];

    sendJson(response, 200, {
      ok: true,
      ollamaReachable: true,
      ollamaBaseUrl: config.ollamaBaseUrl,
      ollamaModel: config.ollamaModel,
      modelAvailable: modelNames.includes(config.ollamaModel),
      installedModels: modelNames
    });
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      ollamaReachable: false,
      ollamaBaseUrl: config.ollamaBaseUrl,
      ollamaModel: config.ollamaModel,
      error: getErrorMessage(error)
    });
  }
}

async function handleChat(body, response, meta) {
  validateChatPayload(body);

  const ollamaResponse = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.ollamaModel,
      messages: body.messages,
      stream: false,
      keep_alive: config.ollamaKeepAlive,
      think: config.ollamaThink,
      options: {
        num_predict: config.ollamaNumPredict,
        temperature: config.ollamaTemperature
      }
    })
  });

  if (!ollamaResponse.ok) {
    const errorText = await safeReadText(ollamaResponse);
    throw new Error(
      `Ollama chat request failed with status ${ollamaResponse.status}${
        errorText ? `: ${errorText}` : ""
      }`
    );
  }

  const data = await ollamaResponse.json();
  const reply = data?.message?.content?.trim();

  if (!reply) {
    throw new Error("Ollama returned an empty chat response");
  }

  sendJson(response, 200, {
    ok: true,
    reply,
    model: data.model || config.ollamaModel,
    totalDuration: data.total_duration || null,
    evalCount: data.eval_count || null
  });

  const elapsedMs = Date.now() - meta.requestStartedAt;
  console.log(
    `[neuro-chat-server] Completed /chat for ${meta.clientAddress} in ${elapsedMs}ms`
  );
}

function validateChatPayload(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new Error("Request body must include a non-empty messages array");
  }

  for (const message of body.messages) {
    if (!message || typeof message !== "object") {
      throw new Error("Each message must be an object");
    }

    if (!["system", "user", "assistant"].includes(message.role)) {
      throw new Error("Each message role must be system, user, or assistant");
    }

    if (typeof message.content !== "string" || !message.content.trim()) {
      throw new Error("Each message content must be a non-empty string");
    }
  }
}

function isAuthorized(request) {
  if (!config.apiKey) {
    return true;
  }

  const header = request.headers.authorization || "";
  return header === `Bearer ${config.apiKey}`;
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;

    request.on("data", (chunk) => {
      totalLength += chunk.length;

      if (totalLength > 1024 * 1024) {
        reject(new Error("Request body is too large"));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });

    request.on("error", reject);
  });
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function stripTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeThink(value) {
  const normalized = String(value || "false").trim().toLowerCase();

  if (["low", "medium", "high"].includes(normalized)) {
    return normalized;
  }

  return normalized === "true";
}

function getErrorMessage(error) {
  if (!(error instanceof Error)) {
    return "Unexpected server error";
  }

  const details = [];

  if (error.message) {
    details.push(error.message);
  }

  const cause = error.cause;

  if (cause instanceof Error && cause.message && cause.message !== error.message) {
    details.push(cause.message);
  } else if (cause && typeof cause === "object") {
    const causeMessage = typeof cause.message === "string" ? cause.message : "";
    const causeCode = typeof cause.code === "string" ? cause.code : "";

    if (causeCode) {
      details.push(causeCode);
    }

    if (causeMessage && causeMessage !== error.message) {
      details.push(causeMessage);
    }
  }

  return details.filter(Boolean).join(": ") || "Unexpected server error";
}

function loadEnvFile(pathname) {
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
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
