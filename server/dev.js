const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

const projectRoot = join(__dirname, "..");
const args = process.argv.slice(2);
const enableTunnel = args.includes("--tunnel");
const enableTailscale = args.includes("--tailscale");
const enableFunnel = args.includes("--funnel");
const openWeb = args.includes("--web");
const serverOnly = args.includes("--server-only");
const isWindows = process.platform === "win32";

const children = [];
let shuttingDown = false;

function startProcess(name, command, commandArgs, options = {}) {
  const { fatalOnExit = true, ...spawnOptions } = options;

  const child = spawn(command, commandArgs, {
    cwd: projectRoot,
    stdio: "inherit",
    ...spawnOptions
  });

  children.push(child);

  child.on("error", (error) => {
    console.error(`[dev] Failed to start ${name}: ${error.message}`);
    if (fatalOnExit) {
      shutdown(1);
    }
  });

  child.on("exit", (code, signal) => {
    if (!shuttingDown && (code !== 0 || signal)) {
      console.error(
        `[dev] ${name} exited with code ${code ?? "null"}${signal ? ` (signal ${signal})` : ""}`
      );
      if (fatalOnExit) {
        shutdown(typeof code === "number" && code !== 0 ? code : 1);
      } else {
        console.warn(`[dev] ${name} stopped, keeping LLM Bridge running.`);
      }
    }
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  process.exitCode = exitCode;

  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }

  setTimeout(() => {
    for (const child of children) {
      try {
        child.kill("SIGKILL");
      } catch {}
    }
    process.exit(exitCode);
  }, 1_500).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const serverArgs = [join(__dirname, "index.js")];
if (enableTunnel) {
  serverArgs.push("--tunnel");
}
if (enableTailscale) {
  serverArgs.push("--tailscale");
}
if (enableFunnel) {
  serverArgs.push("--funnel");
}

console.log(
  serverOnly
    ? "[dev] Starting NeuroFriend Local LLM Bridge (server only)..."
    : "[dev] Starting NeuroFriend Local LLM Bridge + Expo..."
);
startProcess("LLM Bridge", process.execPath, serverArgs, { fatalOnExit: true });

if (!serverOnly) {
  const localExpoCli = join(projectRoot, "node_modules", "expo", "bin", "cli");
  const expoArgs = ["start"];
  if (openWeb) {
    expoArgs.push("--web");
  }

  setTimeout(() => {
    if (shuttingDown) {
      return;
    }

    if (existsSync(localExpoCli)) {
      startProcess("Expo", process.execPath, [localExpoCli, ...expoArgs], {
        fatalOnExit: false
      });
    } else if (isWindows) {
      startProcess("Expo", "cmd.exe", ["/d", "/s", "/c", "npx", "expo", ...expoArgs], {
        fatalOnExit: false
      });
    } else {
      startProcess("Expo", "npx", ["expo", ...expoArgs], {
        fatalOnExit: false
      });
    }
  }, 800);
}
