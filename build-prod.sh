#!/usr/bin/env bash
# Build production bundle for Node.js server (SvelteKit adapter-node).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> git to invoice · production build"
echo "    cwd: $ROOT"

if ! command -v node >/dev/null 2>&1; then
	echo "ERROR: node is not installed or not in PATH." >&2
	exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: npm is not installed or not in PATH." >&2
	exit 1
fi

echo "==> Node $(node -v) · npm $(npm -v)"

echo "==> Installing dependencies"
npm install

echo "==> Building (vite build → ./build)"
npm run build

if [[ ! -f "$ROOT/build/index.js" ]]; then
	echo "ERROR: build/index.js was not created." >&2
	exit 1
fi

echo
echo "Build OK."
echo "  Output: $ROOT/build"
echo
echo "Run once with Node:"
echo "  NODE_ENV=production HOST=0.0.0.0 PORT=3000 npm start"
echo
echo "Or with PM2:"
echo "  ./start-pm2.sh"
echo
