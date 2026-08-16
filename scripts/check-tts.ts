// Spot-check the Old English narrator: transliterates sample sentences and
// synthesizes them through Chatterbox (requires infra/voices/narrator_sample.wav
// and the chatterbox container running).
//
// Usage:
//   npm run check-tts

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transliterate } from '../shared/oedict.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TTS_URL = process.env.CHATTERBOX_URL ?? 'http://localhost:4123';
const SAMPLE = path.join(__dirname, '..', 'infra', 'voices', 'narrator_sample.wav');
const OUT_DIR = path.join(os.tmpdir(), 'oechat-tts-check');

const SENTENCES = [
  'Wes hāl, frēond. Hū eart þū?',
  'Wes hāl, frēond. Hū gǣþ hit?',
  'Iċ eom Ālfrēd, se cyning. Hwæt is þīn nama?',
  'Godne morgen! Sprecan wē on Englisċ?',
  'Mīn nama is Cædmon. Iċ lufie medu.',
];

async function main() {
  const health = await fetch(`${TTS_URL}/health`, { signal: AbortSignal.timeout(3000) });
  if (!health.ok) {
    console.error(`✗ Chatterbox not healthy at ${TTS_URL}`);
    process.exit(1);
  }
  if (!fs.existsSync(SAMPLE)) {
    console.error(`✗ missing ${SAMPLE} — copy it from elderlingo (see README)`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const sample = fs.readFileSync(SAMPLE);
  for (const [i, sentence] of SENTENCES.entries()) {
    const input = transliterate(sentence);
    const form = new FormData();
    form.append('input', input);
    form.append('voice_file', new Blob([new Uint8Array(sample)], { type: 'audio/wav' }), 'narrator_sample.wav');
    const res = await fetch(`${TTS_URL}/v1/audio/speech/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`chatterbox ${res.status}: ${await res.text()}`);
    const wav = Buffer.from(await res.arrayBuffer());
    const outFile = path.join(OUT_DIR, `${String(i + 1).padStart(2, '0')}.mp3`);
    const tmp = path.join(OUT_DIR, `tmp-${i}.wav`);
    fs.writeFileSync(tmp, wav);
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-q:a', '3', outFile]);
    } finally {
      fs.rmSync(tmp, { force: true });
    }
    console.log(`✓ ${i + 1}. ${sentence}\n     → ${input}\n     → ${outFile}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});