const { randomBytes } = require("node:crypto");
const { writeFileSync } = require("node:fs");
const { networkInterfaces } = require("node:os");
const { join } = require("node:path");
const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const {
  LOCAL_LLM_PRESETS,
  getServerConfig,
  loadEnvFile,
  normalizeBaseUrl,
  probeSpecificEndpoint,
  scanLocalLlms
} = require("./llmClient");

function getLanAddresses() {
  const interfaces = networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(interfaces)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    for (const entry of entries) {
      if (
        entry &&
        entry.family === "IPv4" &&
        !entry.internal &&
        !entry.address.startsWith("169.254.")
      ) {
        addresses.push(entry.address);
      }
    }
  }

  return addresses;
}

function buildEnvContent(values) {
  return [
    "# NeuroFriend Local LLM Bridge configuration",
    "# Сгенерировано командой: npm run llm:setup",
    "",
    "# Адрес и порт моста, к которому подключается приложение",
    `CHAT_SERVER_HOST=${values.host}`,
    `CHAT_SERVER_PORT=${values.port}`,
    "",
    "# Опциональный токен защиты моста (оставьте пустым для быстрого локального запуска)",
    `CHAT_SERVER_API_KEY=${values.apiKey}`,
    "",
    "# Провайдер локальной LLM: auto | ollama | openai",
    "#   auto   — автоопределение (Ollama / LM Studio / llama.cpp / vLLM / MLX / Jan)",
    "#   ollama — Ollama API (/api/chat)",
    "#   openai — любой OpenAI-совместимый сервер (/v1/chat/completions)",
    `LLM_PROVIDER=${values.llmProvider}`,
    "",
    "# URL вашей локальной LLM (оставьте пустым для автопоиска по стандартным портам)",
    `LLM_BASE_URL=${values.llmBaseUrl}`,
    "",
    "# Имя модели (оставьте пустым для автоматического выбора загруженной модели)",
    `LLM_MODEL=${values.llmModel}`,
    "",
    "# Опциональный API-ключ для самой LLM (если ваш сервер требует Bearer-токен)",
    `LLM_API_KEY=${values.llmApiKey}`,
    "",
    "# Параметры генерации",
    `LLM_TEMPERATURE=${values.llmTemperature}`,
    `LLM_MAX_TOKENS=${values.llmMaxTokens}`,
    `LLM_TIMEOUT_MS=${values.llmTimeoutMs}`,
    "",
    "# Настройки только для Ollama",
    `OLLAMA_KEEP_ALIVE=${values.ollamaKeepAlive}`,
    `OLLAMA_THINK=${values.ollamaThink}`,
    "",
    "# Публичный HTTPS-туннель (для телефона вне домашнего Wi-Fi): true | false",
    `ENABLE_PUBLIC_TUNNEL=${values.enablePublicTunnel ? "true" : "false"}`,
    ""
  ].join("\n");
}

async function main() {
  loadEnvFile(join(__dirname, ".env"));
  const current = getServerConfig();
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log("");
    console.log("=========================================================");
    console.log("  NeuroFriend — Быстрая настройка локальной LLM");
    console.log("=========================================================");
    console.log("Ищу запущенные локальные LLM на компьютере...");

    const detected = await scanLocalLlms(1_500);

    if (detected.length > 0) {
      console.log("");
      console.log("Найдены запущенные локальные LLM:");
      detected.forEach((item, index) => {
        const modelsPreview = item.models.length
          ? item.models.slice(0, 3).join(", ") + (item.models.length > 3 ? ` (+${item.models.length - 3})` : "")
          : "модели не загружены";
        console.log(`  [${index + 1}] ${item.label} — ${item.baseUrl} (${modelsPreview})`);
      });
    } else {
      console.log("");
      console.log("Сейчас ни один локальный LLM-сервер не отвечает (это нормально, его можно запустить позже).");
    }

    console.log("");
    console.log("Выберите способ подключения:");
    const options = [];

    for (const item of detected) {
      options.push({
        label: `Подключить найденный ${item.label} (${item.baseUrl})`,
        provider: item.provider,
        baseUrl: item.baseUrl,
        models: item.models
      });
    }

    options.push({
      label: "Автопоиск при запуске (сам найдёт Ollama / LM Studio / llama.cpp / vLLM / MLX)",
      provider: "auto",
      baseUrl: "",
      models: []
    });

    for (const preset of LOCAL_LLM_PRESETS.slice(0, 4)) {
      if (!detected.some((item) => item.baseUrl === preset.baseUrl)) {
        options.push({
          label: `${preset.label} (${preset.baseUrl})`,
          provider: preset.provider,
          baseUrl: preset.baseUrl,
          models: []
        });
      }
    }

    options.push({
      label: "Указать свой URL (другой порт, другой ПК в сети или OpenAI-совместимый API)",
      provider: "custom",
      baseUrl: "",
      models: []
    });

    options.forEach((opt, idx) => {
      console.log(`  ${idx + 1}. ${opt.label}`);
    });

    const choiceRaw = (await rl.question(`\nНомер варианта [1]: `)).trim();
    const choiceIndex = Math.max(0, Math.min(options.length - 1, (Number(choiceRaw) || 1) - 1));
    const chosen = options[choiceIndex];

    let llmProvider = chosen.provider;
    let llmBaseUrl = chosen.baseUrl;
    let llmApiKey = current.llmApiKey;
    let detectedModels = [...chosen.models];

    if (chosen.provider === "custom") {
      const customUrlRaw = await rl.question(
        "URL локальной LLM (например http://127.0.0.1:1234 или http://127.0.0.1:8080/v1): "
      );
      llmBaseUrl = normalizeBaseUrl(customUrlRaw);

      const providerRaw = (
        await rl.question("Формат API — auto / ollama / openai [auto]: ")
      ).trim().toLowerCase();
      llmProvider = ["ollama", "openai", "auto"].includes(providerRaw) ? providerRaw : "auto";

      const upstreamKeyRaw = (
        await rl.question("API-ключ самой LLM (если не нужен — просто Enter): ")
      ).trim();
      llmApiKey = upstreamKeyRaw;

      if (llmBaseUrl) {
        console.log(`Проверяю ${llmBaseUrl}...`);
        try {
          const probed = await probeSpecificEndpoint(llmBaseUrl, llmProvider, llmApiKey, 3_000);
          llmProvider = probed.provider;
          detectedModels = probed.models;
          console.log(
            `Успешно подключено (${probed.label}). Найдено моделей: ${probed.models.length}`
          );
        } catch (error) {
          console.log(
            `Предупреждение: сервер пока не ответил (${error instanceof Error ? error.message : String(error)}). Настройки всё равно сохраним.`
          );
        }
      }
    }

    let llmModel = "";
    if (detectedModels.length > 0) {
      console.log("");
      console.log("Доступные модели:");
      console.log("  0. Авто (использовать первую доступную модель)");
      detectedModels.forEach((modelName, idx) => {
        console.log(`  ${idx + 1}. ${modelName}`);
      });
      const modelRaw = (await rl.question("\nВыберите номер модели или введите имя [0]: ")).trim();
      if (!modelRaw || modelRaw === "0") {
        llmModel = "";
      } else if (/^\d+$/.test(modelRaw) && detectedModels[Number(modelRaw) - 1]) {
        llmModel = detectedModels[Number(modelRaw) - 1];
      } else {
        llmModel = modelRaw;
      }
    } else {
      const modelRaw = (
        await rl.question("\nИмя модели (оставьте пустым для автовыбора): ")
      ).trim();
      llmModel = modelRaw;
    }

    const tokenRaw = (
      await rl.question(
        "\nТокен для защиты моста (Enter — без токена для быстрого локального старта, или введите 'gen' чтобы сгенерировать): "
      )
    ).trim();

    let apiKey = "";
    if (tokenRaw.toLowerCase() === "gen") {
      apiKey = randomBytes(16).toString("hex");
      console.log(`Сгенерирован токен: ${apiKey}`);
    } else {
      apiKey = tokenRaw;
    }

    const envPath = join(__dirname, ".env");
    const envContent = buildEnvContent({
      host: current.host || "0.0.0.0",
      port: current.port || 3001,
      apiKey,
      llmProvider,
      llmBaseUrl,
      llmModel,
      llmApiKey,
      llmTemperature: current.llmTemperature,
      llmMaxTokens: current.llmMaxTokens,
      llmTimeoutMs: current.llmTimeoutMs,
      ollamaKeepAlive: current.ollamaKeepAlive,
      ollamaThink: current.ollamaThink,
      enablePublicTunnel: false
    });

    writeFileSync(envPath, envContent, "utf8");

    const lanAddresses = getLanAddresses();
    console.log("");
    console.log("=========================================================");
    console.log(`  Готово! Конфигурация сохранена в: server/.env`);
    console.log("=========================================================");
    console.log(`  Провайдер: ${llmProvider}`);
    console.log(`  URL LLM:   ${llmBaseUrl || "auto (автопоиск)"}`);
    console.log(`  Модель:    ${llmModel || "auto"}`);
    console.log(`  Токен:     ${apiKey || "(отключён для локального режима)"}`);
    console.log("");
    console.log("  Дальше запустите проект одной командой:");
    console.log("    npm run dev");
    console.log("");
    console.log("  Или отдельно мост:");
    console.log("    npm run server:start");
    console.log("");
    console.log(`  Адрес для ПК:      http://localhost:${current.port || 3001}/chat`);
    if (lanAddresses.length > 0) {
      console.log(`  Адрес для Wi-Fi:   http://${lanAddresses[0]}:${current.port || 3001}/chat`);
    }
    console.log("=========================================================");
    console.log("");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("[llm:setup] Ошибка:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
