const { networkInterfaces } = require("node:os");
const { join } = require("node:path");
const {
  getServerConfig,
  loadEnvFile,
  resolveLlmRuntime,
  scanLocalLlms,
  sendChatCompletion
} = require("./llmClient");

function getLanAddresses() {
  const interfaces = networkInterfaces();
  const candidates = [];

  for (const [ifaceName, entries] of Object.entries(interfaces)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    const isVirtual =
      /vethernet|wsl|hyper-v|virtualbox|vmware|docker|vbox|loopback|tailscale|wireguard|zerotier|radmin|hamachi|utun|awdl|llw|bridge|tun|tap|mihomo|clash|sing-box|v2ray/i.test(
        ifaceName.toLowerCase()
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

async function main() {
  const args = new Set(process.argv.slice(2));
  const shouldPing = args.has("--ping");

  loadEnvFile(join(__dirname, ".env"));
  const config = getServerConfig();

  console.log("");
  console.log("=== Проверка подключения локальной LLM ===");
  console.log(`Конфиг: provider=${config.llmProvider}, baseUrl=${config.llmBaseUrl || "auto"}, model=${config.llmModel || "auto"}`);

  try {
    const runtime = await resolveLlmRuntime(config);
    console.log(`[OK] LLM доступна: ${runtime.label} (${runtime.baseUrl})`);
    console.log(`[OK] Активная модель: ${runtime.activeModel || "(не найдена)"}`);

    if (runtime.models.length > 0) {
      console.log(`[OK] Доступные модели (${runtime.models.length}): ${runtime.models.join(", ")}`);
    } else {
      console.log("[WARN] Сервер LLM отвечает, но список моделей пуст. Загрузите модель в Ollama/LM Studio.");
    }

    if (shouldPing) {
      console.log("");
      console.log("Отправляю тестовый запрос модели...");
      const started = Date.now();
      const result = await sendChatCompletion(config, [
        { role: "system", content: "Ответь очень кратко, одним предложением на русском." },
        { role: "user", content: "Привет! Проверка связи." }
      ]);
      const elapsed = Date.now() - started;
      console.log(`[OK] Ответ (${result.model}, ${elapsed}ms): ${result.reply}`);
    }

    const lanAddresses = getLanAddresses();
    console.log("");
    console.log(`URL моста для ПК:     http://localhost:${config.port}/chat`);
    if (lanAddresses.length > 0) {
      console.log(`URL моста для Wi-Fi:  http://${lanAddresses[0]}:${config.port}/chat`);
    }
    console.log("");
  } catch (error) {
    console.error(`[FAIL] ${error instanceof Error ? error.message : String(error)}`);

    const scanned = await scanLocalLlms(1_500);
    if (scanned.length > 0) {
      console.log("");
      console.log("Но на компьютере найдены другие запущенные LLM:");
      for (const item of scanned) {
        console.log(`  - ${item.label}: ${item.baseUrl} (${item.models.join(", ") || "без моделей"})`);
      }
      console.log("Запустите `npm run llm:setup`, чтобы переключиться на одну из них.");
    } else {
      console.log("");
      console.log("Что проверить:");
      console.log("  1. Запущена ли ваша локальная LLM (Ollama / LM Studio / llama-server / vLLM).");
      console.log("  2. Для LM Studio включите Local Server на порту 1234 и загрузите модель.");
      console.log("  3. Для Ollama убедитесь, что есть модель: ollama list");
      console.log("  4. Настройте подключение мастером: npm run llm:setup");
    }

    process.exit(1);
  }
}

main();
