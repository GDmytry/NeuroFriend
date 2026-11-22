#!/usr/bin/env bash
set -euo pipefail

echo "=== Остановка NeuroFriend Bridge / Expo / SSH-туннеля ==="

pkill -f "server/index.js" 2>/dev/null || true
pkill -f "server/dev.js" 2>/dev/null || true
pkill -f "localhost.run" 2>/dev/null || true

echo "Готово. Ваша локальная LLM (Ollama / LM Studio / llama-server) оставлена запущенной."
