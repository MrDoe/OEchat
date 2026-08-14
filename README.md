# OEchat — Sprecan on Englisċ

An Old English voice chatbot. Hold the ᚦ button, speak Old English, and Se
Lēodwita replies in Old English — with an English gloss — spoken back to you
in an authentic reconstructed accent. Everything runs locally.

## Architecture

```
┌─────────────┐  webm   ┌──────────────┐  wav    ┌────────────────────────┐
│ React client│ ──────► │ OEchat server│ ──────► │ faster-whisper (large-v3)│
│ push-to-talk│ ◄────── │  (Express)   │  json   │  local GPU, :8080       │
└─────────────┘  mp3    └──────┬───────┘         └────────────────────────┘
                               │ messages
                      ollama gemma4:12b  (OE reply + English gloss, JSON)
                                │
                       Chatterbox :4123  (zero-shot clone of an Old English
                                          narrator voice, speaking an internal
                                          phonetic script for authentic OE sound)
```

- **STT** — `infra/asr/` runs `faster-whisper` (CTranslate2) on the GPU with
  the cached `Systran/faster-whisper-large-v3` model. Whisper has no Old
  English, so OE is recognized phonetically as English, biased by an Old
  English initial prompt, and best-effort corrected to OE orthography by
  `shared/oedict.ts`.
- **Brain** — ollama `gemma4:12b` with a system prompt pinning early West
  Saxon orthography, simple sentences, a vocabulary list (generated from the
  dictionary) and strict JSON `{"oe": …, "gloss": …}` output.
- **TTS** — Chatterbox (elderlingo's `infra/tts-compose.yml`) synthesizes via
  zero-shot voice cloning of `infra/voices/narrator_sample.wav`. OE text is
  converted to an internal phonetic script by the mechanical rules of the
  `altenglisch-lautschrift` skill (diphthongs, vowel length, palatal c/g, h,
  fricative voicing; `shared/oedict.ts` `transliterate()`), after canonicalizing
  through the dictionary. The learned multilingual tokenizer pronounces this
  German-readable script with German phonology — the closest authentic OE sound.
- **Client** — React + Vite, single chat page: hold-to-talk mic, text fallback,
  mute toggle, auto-play of replies, service health indicators.

## Setup

Prereqs: Node ≥ 22, Python ≥ 3.11, ffmpeg, docker (for Chatterbox), ollama
running, NVIDIA GPU with the container toolkit for chatterbox.

```bash
npm install
bash scripts/gpu-status.sh        # check VRAM headroom first

# 1. STT — first start creates infra/asr/.venv and finishes the
#    faster-whisper-large-v3 download (~3 GB, cached in ~/.cache/huggingface)
bash infra/asr/run.sh             # → http://localhost:8080

# 2. TTS — Chatterbox container (from elderlingo):
docker compose -f ../elderlingo/infra/tts-compose.yml up -d   # :4123

# 3. Brain — pull the model and check the voice sample exists
ollama pull gemma4:12b
ls infra/voices/narrator_sample.wav   # copied from elderlingo

# 4. App
npm run dev                         # server :3001, client http://localhost:5173
```

## VRAM budget (16 GB)

| Service | Usage |
|---|---|
| Chatterbox TTS (multilingual) | ~4.9 GB |
| faster-whisper large-v3 `int8_float16` | ~2.3 GB |
| gemma4:12b Q4_K_M (`num_ctx=4096`) | ~7.6 GB |
| **Total** | **~14.9 GB** |

Everything is loaded concurrently, so stop other models (`ollama stop` /
unload ollama models you are not using) before starting. If a service fails
with CUDA OOM, free VRAM first, then retry — the services load lazily.

Tuning:
- `WHISPER_COMPUTE_TYPE=float16` (`infra/asr/run.sh`) — slightly better
  accuracy, +1.5 GB VRAM. `WHISPER_DEVICE=cpu` trades speed for ~2 GB.
- `LLM_MODEL`, `OLLAMA_URL`, `WHISPER_URL`, `CHATTERBOX_URL`, `OE_VOICE_SAMPLE`,
  `PORT` env vars override defaults.

## Dictionary & transliteration

`shared/oedict.json` is generated from elderlingo's hand-curated entries plus
~70 extra conversational words (`scripts/sync-dict.ts`):

```bash
npm run sync-dict      # refresh after elderlingo's content changes
npm run check-tts      # synthesize sample sentences, listen to /tmp/oechat-tts-check/
```

`shared/oedict.ts` provides:
- `transliterate(text)` — OE → internal Lautschrift for Chatterbox per the
  `altenglisch-lautschrift` skill (canonicalize via lexicon longest phrase
  first, then mechanical rules per word; `toLautschriftWord()`).
- `correctTranscript(text)` — best-effort whisper output → OE orthography.
- `vocabularyBlock()` — OE wordlist with glosses for the LLM prompt.

## Ports

- OEchat server: `3001` (elderlingo uses the same port — run one at a time,
  or set `PORT=3002`).
- STT: `8080` · Chatterbox: `4123` · ollama: `11434` · Vite dev: `5173`.

## Tests

```bash
npm test          # vitest: transliteration + correction + LLM JSON parsing
npm run typecheck
```

## Known limits

- Whisper has no Old English — expect mis-transcriptions; the LLM is prompted
  to interpret them charitably. Recording your own OE audio and fine-tuning
  Whisper later would be the big accuracy win.
- The transliteration fallback rules are approximations; add words to
  `EXTRA_ENTRIES` in `scripts/sync-dict.ts` to improve pronunciation.
- gemma4:12b's Old English is solid for simple sentences but occasionally
  slips modern words or grammar.
