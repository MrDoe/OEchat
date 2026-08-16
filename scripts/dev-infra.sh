#!/usr/bin/env bash
# Starts whisper (infra/asr), Chatterbox (elderlingo compose) and ollama for
# `npm run dev`, skipping any service that is already healthy. Stays in the
# foreground under concurrently; on exit it stops the whisper/ollama instances
# it started (Chatterbox remains as a docker container).
#
# Env overrides:
#   WHISPER_URL=http://localhost:8080
#   CHATTERBOX_URL=http://localhost:4123
#   OLLAMA_URL=http://localhost:11434
#   ELDERLINGO_COMPOSE=../elderlingo/infra/tts-compose.yml
set -euo pipefail

WHISPER_URL="${WHISPER_URL:-http://localhost:8080}"
CHATTERBOX_URL="${CHATTERBOX_URL:-http://localhost:4123}"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ELDERLINGO_COMPOSE="${ELDERLINGO_COMPOSE:-$REPO_DIR/../elderlingo/infra/tts-compose.yml}"

health() { curl -fsS -m 2 "$1/health" >/dev/null 2>&1; }
whisper_healthy() { curl -fsS -m 2 "$WHISPER_URL/health" 2>/dev/null | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'; }
ollama_healthy() { curl -fsS -m 2 "$OLLAMA_URL/api/tags" >/dev/null 2>&1; }

wait_healthy() {
  local name="$1" url="$2"
  local i=0
  while ! health "$url"; do
    i=$((i + 1))
    if [[ $i -gt 900 ]]; then
      echo "[infra] $name did not become healthy at $url" >&2
      return 1
    fi
    if [[ $((i % 30)) -eq 1 ]]; then echo "[infra] waiting for $name ($url)…"; fi
    sleep 2
  done
}

WHISPER_PID=""
OLLAMA_PID=""
cleanup() {
  if [[ -n "$WHISPER_PID" ]] && kill -0 "$WHISPER_PID" 2>/dev/null; then
    echo "[infra] stopping whisper (pid $WHISPER_PID)…"
    kill "$WHISPER_PID" 2>/dev/null || true
    wait "$WHISPER_PID" 2>/dev/null || true
  fi
  if [[ -n "$OLLAMA_PID" ]] && kill -0 "$OLLAMA_PID" 2>/dev/null; then
    echo "[infra] stopping ollama (pid $OLLAMA_PID)…"
    kill "$OLLAMA_PID" 2>/dev/null || true
    wait "$OLLAMA_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# whisper
if whisper_healthy; then
  echo "[infra] whisper already running at $WHISPER_URL"
else
  echo "[infra] starting whisper…"
  bash "$REPO_DIR/infra/asr/run.sh" &
  WHISPER_PID=$!
  while ! whisper_healthy; do
    if ! kill -0 "$WHISPER_PID" 2>/dev/null; then
      echo "[infra] whisper failed to start" >&2
      exit 1
    fi
    sleep 2
  done
  echo "[infra] whisper ready at $WHISPER_URL"
fi

# chatterbox
if health "$CHATTERBOX_URL"; then
  echo "[infra] chatterbox already running at $CHATTERBOX_URL"
else
  echo "[infra] starting chatterbox…"
  docker compose -f "$ELDERLINGO_COMPOSE" up -d
  wait_healthy "chatterbox" "$CHATTERBOX_URL" || exit 1
  echo "[infra] chatterbox ready at $CHATTERBOX_URL"
fi

# ollama
if ollama_healthy; then
  echo "[infra] ollama already running at $OLLAMA_URL"
elif command -v ollama >/dev/null 2>&1; then
  echo "[infra] starting ollama…"
  ollama serve &
  OLLAMA_PID=$!
  while ! ollama_healthy; do
    if ! kill -0 "$OLLAMA_PID" 2>/dev/null; then
      echo "[infra] ollama failed to start" >&2
      exit 1
    fi
    sleep 2
  done
  echo "[infra] ollama ready at $OLLAMA_URL"
else
  echo "[infra] ollama not found on PATH — install it and re-run" >&2
  exit 1
fi

echo "[infra] up — ctrl-c stops whisper/ollama (if started here) and the dev servers"
wait
