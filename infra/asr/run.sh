#!/usr/bin/env bash
# Starts the local faster-whisper ASR service on port 8080 (GPU).
#
# Env overrides:
#   WHISPER_MODEL=large-v3           model name (HF hub, cached locally)
#   WHISPER_DEVICE=cuda              cuda | cpu
#   WHISPER_COMPUTE_TYPE=int8_float16   int8_float16 (~2 GB VRAM, fits the
#                                       16 GB budget with chatterbox + ollama)
#                                       float16 (~4 GB, slightly better accuracy)
#   WHISPER_LANGUAGE=en
#   PORT=8080
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -d "$DIR/.venv" ]]; then
  echo "creating venv…"
  python3 -m venv "$DIR/.venv"
  "$DIR/.venv/bin/pip" install -q --upgrade pip
  "$DIR/.venv/bin/pip" install -q -r "$DIR/requirements.txt"
fi

exec "$DIR/.venv/bin/uvicorn" main:app \
  --app-dir "$DIR" \
  --host 0.0.0.0 \
  --port "${PORT:-8080}" \
  --no-access-log