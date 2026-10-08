#!/usr/bin/env bash
# Start (or reload) production app with PM2.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

APP_NAME="git-to-invoice"
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

echo "==> git to invoice · PM2 start"
echo "    cwd: $ROOT"

if ! command -v node >/dev/null 2>&1; then
	echo "ERROR: node is not installed or not in PATH." >&2
	exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: npm is not installed or not in PATH." >&2
	exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
	echo "==> pm2 not found — installing globally"
	npm install -g pm2
fi

if [[ ! -f "$ROOT/build/index.js" ]]; then
	echo "==> Production build missing — running ./build-prod.sh"
	"$ROOT/build-prod.sh"
fi

export NODE_ENV=production
export HOST
export PORT

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
	echo "==> Reloading existing PM2 process: $APP_NAME"
	pm2 reload ecosystem.config.cjs --update-env
else
	echo "==> Starting PM2 process: $APP_NAME"
	pm2 start ecosystem.config.cjs
fi

pm2 save
pm2 status

echo
echo "App should listen on http://${HOST}:${PORT}"
echo "Useful commands:"
echo "  pm2 logs $APP_NAME"
echo "  pm2 restart $APP_NAME"
echo "  pm2 stop $APP_NAME"
echo
