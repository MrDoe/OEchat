# Local speech recognition service for OEchat, powered by faster-whisper
# (CTranslate2). Uses the cached Systran/faster-whisper-large-v3 model — no
# new downloads beyond finishing that one.
#
# Run:   bash infra/asr/run.sh
# Test:  curl -F file=@audio.wav http://localhost:8080/transcribe

import io
import os

from fastapi import FastAPI, Request
from faster_whisper import WhisperModel

MODEL = os.environ.get("WHISPER_MODEL", "large-v3")
DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8_float16")
LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "en")

# Biases decoding toward Old English words, counteracting Whisper's tendency
# to "modernize" archaic-sounding speech.
INITIAL_PROMPT = (
    "Hwæt! Wes hāl. God morgen. Iċ eom hāl. Þū eart lēof. Wē sindon ġesunde. "
    "Þancie þē. Hū eart þū? Hwæt is þīn nama? Mīn nama is Cædmon. Hwǣr is se dæġ?"
)

app = FastAPI(title="OEchat ASR")
model: WhisperModel | None = None


@app.on_event("startup")
def load_model() -> None:
    global model
    print(f"loading {MODEL} on {DEVICE} ({COMPUTE_TYPE})…")
    model = WhisperModel(MODEL, device=DEVICE, compute_type=COMPUTE_TYPE)
    print("model ready")


@app.get("/health")
def health() -> dict:
    return {"ok": model is not None, "model": MODEL, "device": DEVICE}


@app.post("/transcribe")
async def transcribe(request: Request) -> dict:
    if model is None:
        return {"error": "model not loaded"}, 503
    data = await request.body()
    if not data:
        return {"error": "no audio"}, 400
    lang = request.query_params.get("lang", LANGUAGE)
    prompt = request.query_params.get("prompt", INITIAL_PROMPT)
    hot = request.query_params.get("hotwords")
    segments, info = model.transcribe(
        io.BytesIO(data),
        language=lang,
        beam_size=1,
        temperature=0.0,
        vad_filter=True,
        initial_prompt=prompt,
        hotwords=hot if hot else None,
        condition_on_previous_text=False,
    )
    text = " ".join(s.text.strip() for s in segments).strip()
    return {"text": text, "language": info.language, "duration": info.duration}
