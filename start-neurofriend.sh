#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Include common Homebrew / nvm / volta paths on macOS & Linux
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.nvm/current/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js не найден. Установите Node.js >= 20 (https://nodejs.org или: brew install node)."
  exit 1
fi

if [ ! -f "$PROJECT_DIR/server/.env" ] && [ -f "$PROJECT_DIR/server/.env.example" ]; then
  cp "$PROJECT_DIR/server/.env.example" "$PROJECT_DIR/server/.env"
  echo "[INFO] Создан server/.env из server/.env.example"
fi

if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  echo "[INFO] Устанавливаю JS-зависимости (npm install)..."
  npm install
fi

echo ""
echo "=== Проверка локальной LLM ==="
node "$PROJECT_DIR/server/check.js" || true

echo ""
echo "=== Запуск NeuroFriend (LLM Bridge + Expo) ==="
exec node "$PROJECT_DIR/server/dev.js" "$@"
