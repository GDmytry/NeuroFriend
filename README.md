# NeuroFriend (Neuro Chat Mobile)

Мобильное и веб Expo-приложение для чата с локальной нейросетью с авторизацией, синхронизацией диалогов, выбором модели и стиля общения (`друг`, `коуч`, `психолог`).

## Быстрое подключение своей локальной LLM

Поддерживаются **Ollama**, **LM Studio**, **llama.cpp (`llama-server`)**, **vLLM**, **MLX**, **Jan**, **KoboldCPP** и любой OpenAI-совместимый сервер.

1. Запустите вашу локальную LLM на компьютере (Ollama, LM Studio Local Server, `llama-server` и т. д.).
2. Установите зависимости (в первый раз):

```bash
npm install
```

3. *(Опционально)* Пройдите мастер настройки или проверьте автоопределение модели:

```bash
npm run llm:setup   # интерактивный выбор сервера и модели
npm run llm:check   # быстрая проверка подключения
npm run llm:ping    # тестовый запрос к модели
```

4. Запустите мост и приложение одной командой:

```bash
npm run dev         # мост (:3001) + Expo
npm run dev:web     # мост (:3001) + сразу открыть в браузере
npm run dev:tunnel  # мост + Expo + публичный HTTPS-туннель для телефона вне Wi-Fi
```

На macOS / Linux можно также запускать `./start-neurofriend.sh` (остановка: `./stop-neurofriend.sh`).

Подробное руководство по всем вариантам LLM и подключению с телефона: [docs/LOCAL_LLM_SETUP.md](docs/LOCAL_LLM_SETUP.md).

## Полезные команды

```bash
npm run server:start   # только локальный LLM-мост (:3001)
npm run server:tunnel  # локальный LLM-мост + публичный HTTPS-туннель
npm start              # только Expo
npm run ios            # сборка/запуск iOS
npm run android        # сборка/запуск Android
npm run web            # запуск в браузере
npm run typecheck      # проверка TypeScript
```

## Запуск на iPhone через Xcode

В проект добавлен нативный iOS-проект в папке `ios/`:

1. Установите JS-зависимости: `npm install`
2. Если менялись нативные зависимости:
   ```bash
   npx expo prebuild --platform ios
   cd ios && pod install --repo-update && cd ..
   ```
3. Откройте именно workspace в Xcode:
   ```bash
   open ios/NeuroChat.xcworkspace
   ```
4. В Xcode выберите `Targets` -> `NeuroChat` -> `Signing & Capabilities` -> ваш `Team`, подключите iPhone и нажмите `Run`.
5. В приложении откройте **Настройки** и укажите `Phone URL` из консоли моста (`http://<IP-компьютера>:3001/chat`), либо используйте `npm run dev:tunnel` для доступа вне Wi-Fi.
