# Neuro Chat Mobile

Мобильное Expo-приложение для чата с нейросетью с локальной авторизацией, регистрацией, сохранением диалогов и выбором стиля общения.

## Что уже есть

- авторизация и регистрация;
- локальное хранение аккаунта, сессии и истории чатов через `AsyncStorage`;
- режимы общения `друг`, `коуч`, `психолог`;
- список диалогов, создание нового чата и удаление истории;
- подготовленный AI-слой, который пока работает в mock-режиме, но уже умеет собирать payload под будущий API.

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
