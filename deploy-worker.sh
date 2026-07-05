#!/bin/sh
# Wrangler wrapper for WSL. `npx` here resolves to Windows Node, and Windows
# programs can't use a WSL directory as their working directory (UNC path) —
# so this stages worker.js + wrangler.toml into a Windows-side folder and runs
# wrangler from there.
#
#   ./deploy-worker.sh login                        one-time browser sign-in
#   ./deploy-worker.sh deploy                       deploy / update the worker
#   ./deploy-worker.sh secret put GEMINI_API_KEY    store your key (encrypted)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
WINHOME="$(wslpath "$(cmd.exe /c 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r')")"
STAGE="$WINHOME/tungtu-worker"
mkdir -p "$STAGE"
cp "$HERE/worker.js" "$HERE/wrangler.toml" "$STAGE/"
cd "$STAGE"
exec npx wrangler "$@"
