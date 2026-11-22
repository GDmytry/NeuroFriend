const { spawn } = require("node:child_process");
const { join } = require("node:path");

const projectRoot = join(__dirname, "..");
const args = process.argv.slice(2);
const enableTunnel = args.includes("--tunnel");
const openWeb = args.includes("--web");
const isWindows = process.platform === "win32";

const children = [];
let shuttingDown = false;

function startProcess(name, command, commandArgs, options = {}) {
  const child = spawn(command, commandArgs, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: isWindows && command !== process.execPath,
    ...options
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      console.error(`[dev] ${name} exited with code ${code}${signal ? ` (${signal})` : ""}`);
      shutdown(code);
    }
  });

  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

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

console.log("[dev] Starting NeuroFriend Local LLM Bridge + Expo...");
startProcess("LLM Bridge", process.execPath, serverArgs);

const npxBin = isWindows ? "npx.cmd" : "npx";
const expoArgs = ["expo", "start"];
if (openWeb) {
  expoArgs.push("--web");
}

setTimeout(() => {
  if (!shuttingDown) {
    startProcess("Expo", npxBin, expoArgs);
  }
}, 800);
