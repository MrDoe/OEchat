// Local speech recognition via the faster-whisper service (infra/asr/).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { germanToOE, correctTranscript, LEXICON, toLautschriftWord } from '../../shared/oedict.js';

export const WHISPER_URL = process.env.WHISPER_URL ?? 'http://localhost:8080';

// The user speaks Old English with German phonology, and the narrator voice is
// German-trained: German whisper transcribes far closer to the true sound than
// English does (and keeps minimal pairs like wyrd "würd" vs word apart).
// Set WHISPER_LANG=en to fall back to the English-mode fix-ups.
export const WHISPER_LANG = process.env.WHISPER_LANG ?? 'de';

// German-mode initial prompt: a domain word list in Lautschrift. Measured
// against the English-flavoured OE prompt and no prompt at all — this
// transcription (German orthography, no sentence echoes) gives whisper the
// best raw output for `germanToOE`. Kept well under whisper's 448-token
// prompt limit.
export const GERMAN_PROMPT =
  'wes haal fréond huu eart thuu itsch eom miin nama hwät thiin thät good word würd ' +
  'hwäär wäter wilt drinkan ealu seh küning sitth thääre stoole béoth bliithe liif ' +
  'weh sindon hehr mid meh thantschie theh swiithe mann meduseld gréat sele morgen ' +
  'hlāf hūs cyning cwēn sōþ ēst nū sē þē mīn frēond';

let hotwordsCache: string | null = null;
function hotwords(): string {
  if (!hotwordsCache) {
    const seen = new Set<string>();
    for (const e of LEXICON) {
      const lw = toLautschriftWord(e.word);
      if (!seen.has(lw)) {
        seen.add(lw);
        hotwordsCache = (hotwordsCache ? hotwordsCache + ' ' : '') + lw;
      }
    }
  }
  return hotwordsCache ?? '';
}

export async function whisperOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${WHISPER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Browser recordings arrive as webm/opus; whisper.cpp wants 16 kHz mono WAV.
// Also trims leading/trailing silence so whisper doesn't hear room noise.
export function toWav16k(input: Buffer): Buffer {
  const tmpIn = path.join(os.tmpdir(), `oechat-in-${process.pid}-${Date.now()}.webm`);
  const tmpOut = path.join(os.tmpdir(), `oechat-out-${process.pid}-${Date.now()}.wav`);
  try {
    fs.writeFileSync(tmpIn, input);
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-i', tmpIn,
      '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le',
      '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2,' +
        'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.2,areverse',
      tmpOut,
    ]);
    return fs.readFileSync(tmpOut);
  } finally {
    fs.rmSync(tmpIn, { force: true });
    fs.rmSync(tmpOut, { force: true });
  }
}

export async function transcribe(wav: Buffer): Promise<string> {
  const q = new URLSearchParams({ lang: WHISPER_LANG });
  if (WHISPER_LANG === 'de') {
    q.set('hotwords', hotwords());
    q.set('prompt', GERMAN_PROMPT);
  }
  const res = await fetch(`${WHISPER_URL}/transcribe?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav' },
    body: new Uint8Array(wav),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`whisper error ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { text?: string };
  const raw = (body.text ?? '').trim();
  return WHISPER_LANG === 'de' ? germanToOE(raw) : correctTranscript(raw);
}