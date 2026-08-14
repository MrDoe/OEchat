// Old English narrator: Chatterbox TTS (local GPU container, see elderlingo's
// infra/tts-compose.yml) with zero-shot voice cloning from a reference
// recording. OE text is transliterated to German orthography first, whose
// phonology yields the closest authentic Old English sound.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transliterate } from '../../shared/oedict.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CHATTERBOX_URL = process.env.CHATTERBOX_URL ?? 'http://localhost:4123';
export const VOICE_SAMPLE =
  process.env.OE_VOICE_SAMPLE ?? path.join(__dirname, '..', '..', 'infra', 'voices', 'narrator_sample.wav');

export async function chatterboxOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${CHATTERBOX_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function ttsInput(text: string): string {
  return transliterate(text);
}

// Zero-shot clone: upload the Old English reference recording along with the
// German-orthography input; Chatterbox returns a WAV.
export async function synthesize(input: string): Promise<Buffer> {
  const sample = fs.readFileSync(VOICE_SAMPLE);
  const form = new FormData();
  form.append('input', input);
  form.append('voice_file', new Blob([new Uint8Array(sample)], { type: 'audio/wav' }), 'narrator_sample.wav');
  const res = await fetch(`${CHATTERBOX_URL}/v1/audio/speech/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`chatterbox error ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

export function wavToMp3(wav: Buffer): Buffer {
  const tmp = path.join(os.tmpdir(), `oechat-tts-${process.pid}-${Date.now()}.wav`);
  const out = path.join(os.tmpdir(), `oechat-tts-${process.pid}-${Date.now()}.mp3`);
  try {
    fs.writeFileSync(tmp, wav);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-q:a', '3', out]);
    return fs.readFileSync(out);
  } finally {
    fs.rmSync(tmp, { force: true });
    fs.rmSync(out, { force: true });
  }
}