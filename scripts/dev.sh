#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"
if [ ! -d .venv ]; then python3 -m venv .venv; fi
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
cd "$ROOT/frontend"
npm install
npm run dev &
FRONTEND_PID=$!
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' EXIT
wait
