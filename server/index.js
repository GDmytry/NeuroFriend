const { createServer } = require("node:http");
const { execFileSync, spawn } = require("node:child_process");
const { existsSync, writeFileSync } = require("node:fs");
const { networkInterfaces } = require("node:os");
const { join } = require("node:path");
const {
  getServerConfig,
  loadEnvFile,
  resolveLlmRuntime,
  sendChatCompletion
} = require("./llmClient");
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

const cliArgs = new Set(process.argv.slice(2));
const config = getServerConfig();
if (cliArgs.has("--tunnel")) {
  config.enablePublicTunnel = true;
}
if (cliArgs.has("--no-tunnel")) {
  config.enablePublicTunnel = false;
}
if (cliArgs.has("--tailscale")) {
  config.enableTailscaleServe = true;
}
if (cliArgs.has("--funnel")) {
  config.enableTailscaleFunnel = true;
}

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
        name: "neurofriend-local-llm-bridge",
        ok: true,
        health: "/health",
        models: "/models",
        chat: "/chat"
      });
      return;
    }

    if (url.pathname === "/health" && request.method === "GET") {
      await handleHealth(response);
      return;
    }

    if (url.pathname === "/models" && request.method === "GET") {
      if (!isAuthorized(request)) {
        sendUnauthorized(response);
        return;
      }

      await handleModels(response);
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
        sendUnauthorized(response);
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

let publicTunnelBaseUrl = "";
let tunnelProcess = null;
let tailscaleState = {
  available: false,
  dnsName: "",
  ip: "",
  httpsChatUrl: null,
  ipChatUrl: null,
  mode: null
};

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(
      `[neuro-chat-server] Ошибка: порт ${config.port} уже занят другим процессом.`
    );
    console.error(
      "[neuro-chat-server] Возможно, сервер уже запущен. Остановите его (stop-neurofriend-stack.bat) или смените CHAT_SERVER_PORT в server/.env."
    );
  } else {
    console.error(`[neuro-chat-server] Ошибка запуска сервера: ${getErrorMessage(error)}`);
  }
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  const lanAddresses = getLanAddresses();
  tailscaleState = setupTailscaleAccess();
  const llmTargetLabel = config.llmBaseUrl
    ? `${config.llmBaseUrl} (${config.llmProvider})`
    : "auto-detect (Ollama / LM Studio / llama.cpp / vLLM / MLX)";

  console.log("");
  console.log("=========================================================");
  console.log("  NeuroFriend Local LLM Bridge");
  console.log("=========================================================");
  console.log(`  Bridge:    http://${config.host}:${config.port}`);
  console.log(`  PC URL:    http://localhost:${config.port}/chat`);
  for (const ip of lanAddresses) {
    console.log(`  Wi-Fi URL: http://${ip}:${config.port}/chat`);
  }
  if (tailscaleState.httpsChatUrl) {
    console.log(
      `  Tailscale (${tailscaleState.mode || "HTTPS"}): ${tailscaleState.httpsChatUrl}`
    );
  }
  if (tailscaleState.ipChatUrl) {
    console.log(`  Tailscale IP: ${tailscaleState.ipChatUrl}`);
  }
  console.log(`  Health:    http://localhost:${config.port}/health`);
  console.log(`  LLM:       ${llmTargetLabel}`);
  console.log(`  Model:     ${config.llmModel || "auto"}`);
  console.log(`  Auth:      ${config.apiKey ? "Bearer token enabled" : "disabled (local mode)"}`);
  console.log("=========================================================");

  void logInitialLlmProbe();

  if (config.enablePublicTunnel) {
    startPublicSshTunnel();
  }
});

async function logInitialLlmProbe() {
  try {
    const runtime = await resolveLlmRuntime(config);
    console.log(
      `[neuro-chat-server] LLM connected: ${runtime.label} (${runtime.baseUrl})`
    );
    if (runtime.activeModel) {
      console.log(`[neuro-chat-server] Active model: ${runtime.activeModel}`);
    } else {
      console.warn(
        `[neuro-chat-server] LLM reachable at ${runtime.baseUrl}, but no models are currently loaded/installed.`
      );
    }
    if (runtime.models.length > 1) {
      console.log(`[neuro-chat-server] Available models: ${runtime.models.join(", ")}`);
    }
  } catch (error) {
    console.warn(`[neuro-chat-server] Local LLM not detected yet: ${getErrorMessage(error)}`);
    console.warn(
      "[neuro-chat-server] Start Ollama / LM Studio / llama-server, or run: npm run llm:setup"
    );
  }
}

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

async function handleModels(response) {
  try {
    const runtime = await resolveLlmRuntime(config);
    sendJson(response, 200, {
      ok: true,
      provider: runtime.provider,
      providerLabel: runtime.label,
      baseUrl: runtime.baseUrl,
      activeModel: runtime.activeModel,
      models: runtime.models
    });
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      models: [],
      error: getErrorMessage(error)
    });
  }
}

async function handleHealth(response) {
  const lanAddresses = getLanAddresses();
  const lanChatUrls = lanAddresses.map((ip) => `http://${ip}:${config.port}/chat`);
  const publicChatUrl = publicTunnelBaseUrl ? `${publicTunnelBaseUrl}/chat` : null;

  try {
    const runtime = await resolveLlmRuntime(config);
    const activeModel = runtime.activeModel || config.llmModel || null;
    const modelAvailable = Boolean(activeModel);

    sendJson(response, 200, {
      ok: modelAvailable,
      provider: runtime.provider,
      providerLabel: runtime.label,
      llmReachable: true,
      ollamaReachable: true,
      llmBaseUrl: runtime.baseUrl,
      ollamaBaseUrl: runtime.baseUrl,
      activeModel,
      ollamaModel: activeModel,
      configuredModel: config.llmModel || "auto",
      modelAvailable,
      installedModels: runtime.models,
      lanChatUrls,
      publicChatUrl: publicChatUrl || (tailscaleState.mode === "Funnel" ? tailscaleState.httpsChatUrl : null),
      tailscaleChatUrl: tailscaleState.httpsChatUrl,
      tailscaleIpChatUrl: tailscaleState.ipChatUrl,
      tailscaleMode: tailscaleState.mode,
      error: modelAvailable
        ? null
        : `LLM доступна (${runtime.label} на ${runtime.baseUrl}), но не найдено загруженных моделей.`
    });
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      provider: config.llmProvider,
      providerLabel: config.llmProvider === "auto" ? "Автопоиск" : config.llmProvider,
      llmReachable: false,
      ollamaReachable: false,
      llmBaseUrl: config.llmBaseUrl || "auto",
      ollamaBaseUrl: config.llmBaseUrl || "auto",
      activeModel: config.llmModel || null,
      ollamaModel: config.llmModel || null,
      configuredModel: config.llmModel || "auto",
      modelAvailable: false,
      installedModels: [],
      lanChatUrls,
      publicChatUrl: publicChatUrl || (tailscaleState.mode === "Funnel" ? tailscaleState.httpsChatUrl : null),
      tailscaleChatUrl: tailscaleState.httpsChatUrl,
      tailscaleIpChatUrl: tailscaleState.ipChatUrl,
      tailscaleMode: tailscaleState.mode,
      error: getErrorMessage(error)
    });
  }
}

async function handleChat(body, response, meta) {
  validateChatPayload(body);

  const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
  const result = await sendChatCompletion(config, body.messages, requestedModel);

  sendJson(response, 200, {
    ok: true,
    reply: result.reply,
    model: result.model,
    provider: result.provider,
    totalDuration: result.totalDuration,
    evalCount: result.evalCount
  });

  const elapsedMs = Date.now() - meta.requestStartedAt;
  console.log(
    `[neuro-chat-server] Completed /chat for ${meta.clientAddress} (${result.provider}: ${result.model}) in ${elapsedMs}ms`
  );
}

function getLanAddresses() {
  const interfaces = networkInterfaces();
  const candidates = [];

  for (const [ifaceName, entries] of Object.entries(interfaces)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    const lowerName = ifaceName.toLowerCase();
    const isVirtual =
      /vethernet|wsl|hyper-v|virtualbox|vmware|docker|vbox|loopback|tailscale|wireguard|zerotier|radmin|hamachi|utun|awdl|llw|bridge/i.test(
        lowerName
      );

    for (const entry of entries) {
      if (
        entry &&
        entry.family === "IPv4" &&
        !entry.internal &&
        !entry.address.startsWith("169.254.") &&
        !entry.address.startsWith("198.18.") &&
        !entry.address.startsWith("198.19.")
      ) {
        let priority = isVirtual ? 10 : 1;
        if (!isVirtual && entry.address.startsWith("192.168.")) {
          priority = 0;
        } else if (!isVirtual && entry.address.startsWith("10.")) {
          priority = 1;
        } else if (!isVirtual) {
          priority = 2;
        }

        candidates.push({ address: entry.address, priority });
      }
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return [...new Set(candidates.map((item) => item.address))];
}

function findTailscaleBinary() {
  if (process.platform === "win32") {
    const standardWin = "C:\\Program Files\\Tailscale\\tailscale.exe";
    if (existsSync(standardWin)) {
      return standardWin;
    }
  }
  return "tailscale";
}

function setupTailscaleAccess() {
  const result = {
    available: false,
    dnsName: "",
    ip: "",
    httpsChatUrl: null,
    ipChatUrl: null,
    mode: null
  };

  const tsBin = findTailscaleBinary();
  let statusJson;
  try {
    const raw = execFileSync(tsBin, ["status", "--json"], {
      encoding: "utf8",
      timeout: 3_000,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    statusJson = JSON.parse(raw);
  } catch {
    return result;
  }

  if (!statusJson || statusJson.BackendState !== "Running") {
    return result;
  }

  const self = statusJson.Self || {};
  const dnsName = String(self.DNSName || "").replace(/\.+$/, "").trim();
  const ips = Array.isArray(self.TailscaleIPs) ? self.TailscaleIPs : [];
  const ipv4 = ips.find((addr) => typeof addr === "string" && /^\d+\.\d+\.\d+\.\d+$/.test(addr)) || "";

  result.available = true;
  result.dnsName = dnsName;
  result.ip = ipv4;
  result.ipChatUrl = ipv4 ? `http://${ipv4}:${config.port}/chat` : null;

  if (config.enableTailscaleFunnel && dnsName) {
    try {
      execFileSync(tsBin, ["funnel", "--bg", String(config.port)], {
        encoding: "utf8",
        timeout: 6_000,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      result.httpsChatUrl = `https://${dnsName}/chat`;
      result.mode = "Funnel";
      return result;
    } catch (error) {
      console.warn(
        `[neuro-chat-server] Tailscale Funnel не удалось включить автоматически: ${getErrorMessage(error)}`
      );
    }
  }

  if (config.enableTailscaleServe && dnsName) {
    try {
      execFileSync(tsBin, ["serve", "--bg", String(config.port)], {
        encoding: "utf8",
        timeout: 6_000,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      result.httpsChatUrl = `https://${dnsName}/chat`;
      result.mode = "Serve";
      return result;
    } catch (error) {
      console.warn(
        `[neuro-chat-server] Tailscale Serve недоступен (${getErrorMessage(error)}). Используйте Tailscale IP: ${result.ipChatUrl || "не найден"}`
      );
    }
  }

  // Check if serve/funnel is already active from an earlier run
  if (dnsName) {
    try {
      const funnelStatus = execFileSync(tsBin, ["funnel", "status"], {
        encoding: "utf8",
        timeout: 2_500,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      if (funnelStatus.includes(`:${config.port}`)) {
        result.httpsChatUrl = `https://${dnsName}/chat`;
        result.mode = "Funnel";
        return result;
      }
    } catch {}

    try {
      const serveStatus = execFileSync(tsBin, ["serve", "status"], {
        encoding: "utf8",
        timeout: 2_500,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      if (serveStatus.includes(`:${config.port}`)) {
        result.httpsChatUrl = `https://${dnsName}/chat`;
        result.mode = "Serve";
      }
    } catch {}
  }

  return result;
}

function startPublicSshTunnel() {
  try {
    const isWindows = process.platform === "win32";
    const sshBin = isWindows ? "ssh.exe" : "ssh";
    const nullDevice = isWindows ? "NUL" : "/dev/null";

    console.log("[neuro-chat-server] Starting public HTTPS tunnel (localhost.run)...");

    const child = spawn(
      sshBin,
      [
        "-T",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        `UserKnownHostsFile=${nullDevice}`,
        "-o",
        "ServerAliveInterval=30",
        "-R",
        `80:127.0.0.1:${config.port}`,
        "nokey@localhost.run"
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      }
    );

    tunnelProcess = child;

    const handleOutput = (chunk) => {
      const text = String(chunk || "");
      const match = /tunneled with tls termination,\s*(https:\/\/[a-z0-9-]+\.lhr\.life)/i.exec(text);
      if (match && match[1] && match[1] !== publicTunnelBaseUrl) {
        publicTunnelBaseUrl = match[1];
        const chatUrl = `${publicTunnelBaseUrl}/chat`;
        console.log(`[neuro-chat-server] Public HTTPS Tunnel (for Phone): ${chatUrl}`);
        persistTunnelChatUrl(chatUrl);
      }
    };

    child.stdout.on("data", handleOutput);
    child.stderr.on("data", handleOutput);
    child.on("error", (err) => {
      console.warn(`[neuro-chat-server] Public tunnel failed to start: ${getErrorMessage(err)}`);
    });
  } catch (error) {
    console.warn(`[neuro-chat-server] Public tunnel unavailable: ${getErrorMessage(error)}`);
  }
}

function persistTunnelChatUrl(chatUrl) {
  try {
    const tunnelJsonPath = join(__dirname, "..", "src", "config", "tunnelUrl.json");
    writeFileSync(tunnelJsonPath, `${JSON.stringify({ chatUrl }, null, 2)}\n`, "utf8");
  } catch {}
}

function shutdown() {
  if (tunnelProcess) {
    try {
      tunnelProcess.kill();
    } catch {}
    tunnelProcess = null;
  }
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1_500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function validateChatPayload(body) {
  if (!body || typeof body !== "object") {
    throw createHttpError(400, "Request body must be a JSON object");
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw createHttpError(400, "Request body must include a non-empty messages array");
  }

  for (const message of body.messages) {
    if (!message || typeof message !== "object") {
      throw createHttpError(400, "Each message must be an object");
    }

    if (!["system", "user", "assistant"].includes(message.role)) {
      throw createHttpError(400, "Each message role must be system, user, or assistant");
    }

    if (typeof message.content !== "string" || !message.content.trim()) {
      throw createHttpError(400, "Each message content must be a non-empty string");
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
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Session-Token"
  );
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
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

      if (totalLength > 2 * 1024 * 1024) {
        reject(createHttpError(413, "Request body is too large"));
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
        reject(createHttpError(400, "Request body must be valid JSON"));
      }
    });

    request.on("error", reject);
  });
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
