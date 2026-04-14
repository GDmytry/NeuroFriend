const { createServer } = require("node:http");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  createSession,
  deleteThread,
  getUserBySessionToken,
  listThreads,
  loginUser,
  registerUser,
  saveThread,
  saveThreads,
  updateUser
} = require("./store");

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

    if (url.pathname === "/auth/register" && request.method === "POST") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      const body = await readJsonBody(request);
      await handleRegister(body, response);
      return;
    }

    if (url.pathname === "/auth/login" && request.method === "POST") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      const body = await readJsonBody(request);
      await handleLogin(body, response);
      return;
    }

    if (url.pathname === "/auth/session" && request.method === "GET") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      await handleSession(request, response);
      return;
    }

    if (url.pathname === "/auth/me" && request.method === "PATCH") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      const body = await readJsonBody(request);
      await handleUpdateMe(request, body, response);
      return;
    }

    if (url.pathname === "/threads" && request.method === "GET") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      await handleGetThreads(request, response);
      return;
    }

    if (url.pathname === "/threads/sync" && request.method === "POST") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      const body = await readJsonBody(request);
      await handleSyncThreads(request, body, response);
      return;
    }

    if (url.pathname.startsWith("/threads/") && request.method === "PUT") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      const threadId = decodeURIComponent(url.pathname.slice("/threads/".length));
      const body = await readJsonBody(request);
      await handleSaveThread(request, threadId, body, response);
      return;
    }

    if (url.pathname.startsWith("/threads/") && request.method === "DELETE") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      const threadId = decodeURIComponent(url.pathname.slice("/threads/".length));
      await handleDeleteThread(request, threadId, response);
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
    const statusCode =
      error && typeof error === "object" && typeof error.statusCode === "number"
        ? error.statusCode
        : 500;

    sendJson(response, statusCode, {
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

async function handleRegister(body, response) {
  let user;

  try {
    user = registerUser(body);
  } catch (error) {
    error.statusCode = String(error.message || "").includes("already exists") ? 409 : 400;
    throw error;
  }

  const sessionToken = createSession(user.id);

  sendJson(response, 201, {
    ok: true,
    user,
    sessionToken,
    threads: []
  });
}

async function handleLogin(body, response) {
  let user;

  try {
    user = loginUser(body);
  } catch (error) {
    error.statusCode = 401;
    throw error;
  }

  const sessionToken = createSession(user.id);

  sendJson(response, 200, {
    ok: true,
    user,
    sessionToken,
    threads: listThreads(user.id)
  });
}

async function handleSession(request, response) {
  const user = requireSessionUser(request);

  sendJson(response, 200, {
    ok: true,
    user,
    threads: listThreads(user.id)
  });
}

async function handleUpdateMe(request, body, response) {
  const user = requireSessionUser(request);
  const nextUser = updateUser(user.id, body);

  sendJson(response, 200, {
    ok: true,
    user: nextUser
  });
}

async function handleGetThreads(request, response) {
  const user = requireSessionUser(request);

  sendJson(response, 200, {
    ok: true,
    threads: listThreads(user.id)
  });
}

async function handleSyncThreads(request, body, response) {
  const user = requireSessionUser(request);
  const nextThreads = saveThreads(user.id, body?.threads);

  sendJson(response, 200, {
    ok: true,
    threads: nextThreads
  });
}

async function handleSaveThread(request, threadId, body, response) {
  const user = requireSessionUser(request);
  const payload = body?.thread && typeof body.thread === "object" ? body.thread : body;
  const savedThread = saveThread(user.id, {
    ...(payload || {}),
    id: threadId || payload?.id
  });

  sendJson(response, 200, {
    ok: true,
    thread: savedThread
  });
}

async function handleDeleteThread(request, threadId, response) {
  const user = requireSessionUser(request);
  deleteThread(user.id, threadId);

  sendJson(response, 200, {
    ok: true
  });
}

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
    const modelAvailable = modelNames.includes(config.ollamaModel);

    sendJson(response, 200, {
      ok: modelAvailable,
      ollamaReachable: true,
      ollamaBaseUrl: config.ollamaBaseUrl,
      ollamaModel: config.ollamaModel,
      modelAvailable,
      installedModels: modelNames,
      error: modelAvailable
        ? null
        : `Model "${config.ollamaModel}" is not installed or not visible to Ollama`
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

function sendUnauthorized(response) {
  sendJson(response, 401, {
    ok: false,
    error: "Unauthorized"
  });
}

function requireSessionUser(request) {
  const sessionToken = String(request.headers["x-session-token"] || "").trim();

  if (!sessionToken) {
    throw createHttpError(401, "Session token is required");
  }

  const user = getUserBySessionToken(sessionToken);

  if (!user) {
    throw createHttpError(401, "Invalid or expired session");
  }

  return user;
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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
