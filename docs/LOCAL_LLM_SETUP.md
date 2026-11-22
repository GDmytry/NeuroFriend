# Быстрое подключение своей локальной LLM к NeuroFriend

Приложение подключается к вашей модели через встроенный легковесный мост `server/index.js` (без внешних npm-зависимостей):

`NeuroFriend (Web / iOS / Android) -> Local Bridge (:3001) -> Ваша локальная LLM`

## Что поддерживается «из коробки»

Мост автоматически определяет запущенную локальную LLM на компьютере:

| Инструмент | Порт по умолчанию | Формат API |
| --- | --- | --- |
| **Ollama** | `http://127.0.0.1:11434` | Ollama (`/api/chat`) |
| **LM Studio** | `http://127.0.0.1:1234` | OpenAI (`/v1/chat/completions`) |
| **llama.cpp (`llama-server`)** | `http://127.0.0.1:8080` | OpenAI (`/v1/chat/completions`) |
| **vLLM / MLX (`mlx_lm.server`)** | `http://127.0.0.1:8000` | OpenAI (`/v1/chat/completions`) |
| **Jan** | `http://127.0.0.1:1337` | OpenAI (`/v1/chat/completions`) |
| **KoboldCPP / TextGen WebUI** | `http://127.0.0.1:5000` | OpenAI (`/v1/chat/completions`) |
| **Любой свой сервер** | любой URL | задаётся в `server/.env` |

---

## Быстрый старт (3 шага)

### Шаг 1. Запустите свою LLM на компьютере

- **Ollama**: убедитесь, что есть хотя бы одна модель (`ollama list` или `ollama pull qwen2.5:7b` / `ollama pull llama3.2`).
- **LM Studio**: загрузите модель -> вкладка **Developer / Local Server** -> нажмите **Start Server** (порт `1234`).
- **llama.cpp**: `llama-server -m /path/to/model.gguf --port 8080`.
- **MLX (Apple Silicon)**: `mlx_lm.server --model <repo-or-path> --port 8000`.

### Шаг 2. Настройте или проверьте связь

Если хотите выбрать конкретную модель/URL интерактивно:

```bash
npm run llm:setup
```

Или сразу проверьте, что мост видит вашу LLM (без настройки — сработает автопоиск):

```bash
npm run llm:check
```

Отправить короткий тестовый промпт модели из терминала:

```bash
npm run llm:ping
```

### Шаг 3. Запустите проект одной командой

```bash
npm install   # только в первый раз
npm run dev
```

На macOS/Linux также можно запускать:

```bash
./start-neurofriend.sh
```

Команда `npm run dev` одновременно поднимет:
1. Локальный LLM-мост на порту `3001` (`http://localhost:3001/chat`)
2. Expo Dev Server (для браузера, iOS Simulator, Android Emulator и телефона по Wi-Fi)

Для запуска сразу в браузере на ПК:

```bash
npm run dev:web
```

---

## Подключение с разных устройств

1. **Браузер на этом же компьютере / iOS Simulator**: работает автоматически через `http://localhost:3001/chat`.
2. **Android Emulator**: работает автоматически через `http://10.0.2.2:3001/chat`.
3. **Телефон в одной Wi-Fi сети**:
   - При запуске через Expo Go адрес компьютера подставляется автоматически.
   - Вручную (например, в собранном приложении) откройте **Настройки** -> укажите `Phone URL` из консоли моста (вида `http://192.168.x.x:3001/chat`) -> нажмите **Проверить подключение** и **Сохранить подключение**.
4. **Телефон вне домашнего Wi-Fi (мобильный интернет)**:
   - Запустите с публичным HTTPS-туннелем:
     ```bash
     npm run dev:tunnel
     ```
     (или только мост: `npm run server:tunnel`).
   - В консоли появится `Public HTTPS Tunnel (for Phone): https://....lhr.life/chat`.
   - При работе через интернет рекомендуется задать `CHAT_SERVER_API_KEY` в `server/.env` и ввести этот же токен в настройках приложения.

---

## Смена модели на лету

- Внутри приложения откройте **Настройки** -> нажмите **Проверить подключение** -> выберите любую модель из появившихся кнопок -> **Сохранить подключение**.
- Либо укажите `LLM_MODEL=...` в `server/.env` и перезапустите мост.

---

## Ручная настройка `server/.env`

Если нужно подключить нестандартный сервер или порт, отредактируйте `server/.env`:

```env
CHAT_SERVER_HOST=0.0.0.0
CHAT_SERVER_PORT=3001
CHAT_SERVER_API_KEY=

# auto | ollama | openai
LLM_PROVIDER=auto

# Пусто = автопоиск; или конкретный адрес вашей LLM:
LLM_BASE_URL=http://127.0.0.1:1234
LLM_MODEL=
LLM_API_KEY=

LLM_TEMPERATURE=0.6
LLM_MAX_TOKENS=1024
LLM_TIMEOUT_MS=120000
```
