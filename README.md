# Neuro Chat Mobile

Мобильное Expo-приложение для чата с нейросетью с локальной авторизацией, регистрацией, сохранением диалогов и выбором стиля общения.

## Что уже есть

- авторизация и регистрация;
- локальное хранение аккаунта, сессии и истории чатов через `AsyncStorage`;
- режимы общения `друг`, `коуч`, `психолог`;
- список диалогов, создание нового чата и удаление истории;
- подготовленный AI-слой.

## Запуск

```bash
npm install
npm start
```

Также доступны команды:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
```

## Запуск на iPhone через Xcode

В проект уже добавлен нативный iOS-проект в папке `ios/`, так что приложение можно запускать напрямую из Xcode.

1. Установи JS-зависимости:

```bash
npm install
```

2. Если после изменения нативных зависимостей или Expo-конфига нужно пересобрать iOS-проект:

```bash
npx expo prebuild --platform ios
cd ios
pod install --repo-update
cd ..
```

3. Открой workspace в Xcode:

```bash
open ios/NeuroChat.xcworkspace
```

4. В Xcode открой `Targets` -> `NeuroChat` -> `Signing & Capabilities` и выбери свой `Team`.

5. Подключи iPhone, выбери его в списке устройств и нажми `Run`.

Если Xcode попросит доверить сертификат или устройство, подтверди это на Mac и на iPhone.

Важно:

- открывай именно `ios/NeuroChat.xcworkspace`, а не `.xcodeproj`;
- после добавления новых React Native / Expo библиотек снова запускай `pod install`;
- для первого запуска на реальном устройстве нужен твой Apple Developer Team в настройках подписи.

## Как позже подключить реальный AI

Откройте `app.json` и заполните значения в `expo.extra`:

- `useMockAi: false`
- `aiApiUrl: "https://your-api.example.com/chat"`
- `aiApiKey: "your-token"` при необходимости

Приложение отправляет `POST` с таким телом:

```json
{
  "mode": "coach",
  "systemPrompt": "...",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

В ответ ожидается одно из полей:

```json
{ "reply": "..." }
```

или

```json
{ "message": "..." }
```

или

```json
{ "text": "..." }
```
