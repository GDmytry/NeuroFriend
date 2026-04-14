const { mkdirSync, existsSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");

const DATA_FILE = process.env.CHAT_SERVER_DATA_FILE || join(__dirname, "data", "store.json");

function ensureStoreFile() {
  const parentDir = dirname(DATA_FILE);
  mkdirSync(parentDir, { recursive: true });

  if (!existsSync(DATA_FILE)) {
    writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          users: [],
          sessions: [],
          threads: []
        },
        null,
        2
      ),
      "utf8"
    );
  }
}

function readStore() {
  ensureStoreFile();

  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      threads: Array.isArray(parsed.threads) ? parsed.threads : []
    };
  } catch {
    return {
      users: [],
      sessions: [],
      threads: []
    };
  }
}

function writeStore(nextStore) {
  ensureStoreFile();
  writeFileSync(DATA_FILE, JSON.stringify(nextStore, null, 2), "utf8");
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  const [salt, storedHash] = String(passwordHash || "").split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, "hex");

  if (candidate.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(candidate, stored);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function toPublicUser(userRecord) {
  return {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    preferredMode: userRecord.preferredMode || "friend",
    assistantName: userRecord.assistantName || "NeuroFriend",
    createdAt: userRecord.createdAt
  };
}

function validateRegistrationInput(input) {
  const name = String(input?.name || "").trim();
  const email = normalizeEmail(input?.email);
  const password = String(input?.password || "");
  const preferredMode = String(input?.preferredMode || "friend");
  const assistantName = String(input?.assistantName || "").trim() || "NeuroFriend";

  if (!name) {
    throw new Error("Name is required");
  }

  if (!email) {
    throw new Error("Email is required");
  }

  if (!password || password.trim().length < 6) {
    throw new Error("Password must contain at least 6 characters");
  }

  if (!["friend", "coach", "psychologist"].includes(preferredMode)) {
    throw new Error("Invalid preferredMode");
  }

  return {
    name,
    email,
    password,
    preferredMode,
    assistantName
  };
}

function validateLoginInput(input) {
  const email = normalizeEmail(input?.email);
  const password = String(input?.password || "");

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  return {
    email,
    password
  };
}

function registerUser(input) {
  const payload = validateRegistrationInput(input);
  const store = readStore();
  const exists = store.users.some((user) => user.email === payload.email);

  if (exists) {
    throw new Error("User with this email already exists");
  }

  const now = new Date().toISOString();
  const userRecord = {
    id: createId(),
    name: payload.name,
    email: payload.email,
    passwordHash: hashPassword(payload.password),
    preferredMode: payload.preferredMode,
    assistantName: payload.assistantName,
    createdAt: now,
    updatedAt: now
  };

  store.users.push(userRecord);
  writeStore(store);

  return toPublicUser(userRecord);
}

function loginUser(input) {
  const payload = validateLoginInput(input);
  const store = readStore();
  const userRecord = store.users.find((user) => user.email === payload.email);

  if (!userRecord || !verifyPassword(payload.password, userRecord.passwordHash)) {
    throw new Error("Invalid email or password");
  }

  return toPublicUser(userRecord);
}

function createSession(userId) {
  const store = readStore();
  const now = new Date().toISOString();
  const token = randomBytes(32).toString("hex");

  store.sessions = store.sessions.filter((session) => session.userId !== userId);
  store.sessions.push({
    token,
    userId,
    createdAt: now,
    lastSeenAt: now
  });

  writeStore(store);
  return token;
}

function getUserBySessionToken(token) {
  if (!token) {
    return null;
  }

  const store = readStore();
  const session = store.sessions.find((item) => item.token === token);

  if (!session) {
    return null;
  }

  const userRecord = store.users.find((user) => user.id === session.userId);

  if (!userRecord) {
    return null;
  }

  session.lastSeenAt = new Date().toISOString();
  writeStore(store);

  return toPublicUser(userRecord);
}

function updateUser(userId, patch) {
  const store = readStore();
  const index = store.users.findIndex((user) => user.id === userId);

  if (index === -1) {
    throw new Error("User not found");
  }

  const current = store.users[index];
  const assistantName =
    typeof patch?.assistantName === "string" && patch.assistantName.trim()
      ? patch.assistantName.trim()
      : current.assistantName;
  const preferredMode =
    typeof patch?.preferredMode === "string" &&
    ["friend", "coach", "psychologist"].includes(patch.preferredMode)
      ? patch.preferredMode
      : current.preferredMode;

  const next = {
    ...current,
    assistantName,
    preferredMode,
    updatedAt: new Date().toISOString()
  };

  store.users[index] = next;
  writeStore(store);

  return toPublicUser(next);
}

function listThreads(userId) {
  const store = readStore();

  return store.threads
    .filter((thread) => thread.userId === userId)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

function sanitizeAttachment(attachment) {
  return {
    id: String(attachment?.id || createId()),
    name: String(attachment?.name || "text-file.txt"),
    uri: String(attachment?.uri || ""),
    mimeType: String(attachment?.mimeType || "text/plain"),
    size: typeof attachment?.size === "number" ? attachment.size : 0,
    textContent: typeof attachment?.textContent === "string" ? attachment.textContent : ""
  };
}

function sanitizeMessage(message) {
  return {
    id: String(message?.id || createId()),
    author: ["user", "assistant", "system"].includes(message?.author)
      ? message.author
      : "system",
    text: String(message?.text || ""),
    createdAt: String(message?.createdAt || new Date().toISOString()),
    attachments: Array.isArray(message?.attachments)
      ? message.attachments.map(sanitizeAttachment)
      : []
  };
}

function sanitizeThread(userId, rawThread) {
  if (!rawThread || typeof rawThread !== "object") {
    throw new Error("Thread payload is required");
  }

  const id = String(rawThread.id || createId());
  const title = String(rawThread.title || "Новый диалог").trim() || "Новый диалог";
  const mode = ["friend", "coach", "psychologist"].includes(rawThread.mode)
    ? rawThread.mode
    : "friend";
  const createdAt = String(rawThread.createdAt || new Date().toISOString());
  const updatedAt = String(rawThread.updatedAt || new Date().toISOString());
  const messages = Array.isArray(rawThread.messages)
    ? rawThread.messages.map(sanitizeMessage)
    : [];

  return {
    id,
    title,
    mode,
    userId,
    createdAt,
    updatedAt,
    messages
  };
}

function saveThread(userId, rawThread) {
  const store = readStore();
  const thread = sanitizeThread(userId, rawThread);
  const index = store.threads.findIndex((item) => item.id === thread.id);

  if (index === -1) {
    store.threads.push(thread);
  } else {
    store.threads[index] = thread;
  }

  writeStore(store);
  return thread;
}

function saveThreads(userId, rawThreads) {
  if (!Array.isArray(rawThreads)) {
    return listThreads(userId);
  }

  let result = [];

  for (const thread of rawThreads) {
    result.push(saveThread(userId, thread));
  }

  return result.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

function deleteThread(userId, threadId) {
  const store = readStore();
  const nextThreads = store.threads.filter(
    (thread) => !(thread.userId === userId && thread.id === threadId)
  );
  store.threads = nextThreads;
  writeStore(store);
}

module.exports = {
  registerUser,
  loginUser,
  createSession,
  getUserBySessionToken,
  updateUser,
  listThreads,
  saveThread,
  saveThreads,
  deleteThread
};
