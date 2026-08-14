// Pronunciation battery: OE sentence/word -> lautschrift -> Chatterbox TTS ->
// whisper STT. Reports what whisper hears back vs. what was said.
import { writeFileSync } from 'node:fs';

const SENTENCES = [
  'Wes hāl, frēond! Hū eart þū?',
  'Iċ eom hāl. Mīn nama is Ælfred.',
  'Se meduseld is grēat sele.',
  'Wē sindon hēr mid mē.',
  'Þancie þē swīþe, gōd mann.',
  'Hwæt is þīn nama?',
  'Þæt is gōd word, wyrd.',
  'Hwǣr is se wæter?',
  'Wilt þū drincan ealu?',
  'Sē cyning sitþ on þǣre stōle.',
  'Mīn mōdor and mīn fæder sindon hēr.',
  'Bēoþ blīþe, mīn frēond!',
];

const WORDS = [
  'wyrd', 'wæter', 'hlāf', 'hūs', 'cyning', 'cwēn', 'frēond', 'gōd', 'lēof',
  'mōdor', 'fæder', 'sweostor', 'wīf', 'mann', 'dæġ', 'niht', 'morgen',
  'ealu', 'medu', 'sang', 'word', 'līf', 'eorþe', 'heofon', 'sunne',
  'mōna', 'steorra', 'trēow', 'wudu', 'wulf', 'hund', 'hors', 'fugol',
  'fisc', 'hwæt', 'hū', 'hwǣr', 'hwā', 'þæt', 'sē', 'sēo', 'þū', 'mīn',
  'ic', 'wē', 'hē', 'hēo', 'āc', 'lufian', 'sprecan', 'sēon', 'gān',
  'cuman', 'etan', 'drincan', 'biddan', 'hīeran', 'secgan', 'þencan',
];

async function synth(text: string): Promise<Blob> {
  const res = await fetch('http://localhost:3002/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  return res.blob();
}

async function stt(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('audio', blob, 'clip.mp3');
  const res = await fetch('http://localhost:3002/api/stt', { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  const body = (await res.json()) as { transcript?: string };
  return body.transcript ?? '';
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[āáàâ]/g, 'a').replace(/[ēéèê]/g, 'e').replace(/[īíìî]/g, 'i')
    .replace(/[ōóòô]/g, 'o').replace(/[ūúùû]/g, 'u').replace(/[ȳÿ]/g, 'y')
    .replace(/ċ/g, 'c').replace(/ġ/g, 'g').replace(/æ/g, 'ae')
    .replace(/[þð]/g, 'th')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function heardFraction(src: string, heard: string): number {
  const a = new Set(norm(src).split(' '));
  const b = new Set(norm(heard).split(' '));
  if (a.size === 0) return 0;
  let hit = 0;
  for (const w of a) if (b.has(w)) hit++;
  return hit / a.size;
}

const lines: string[] = [];
lines.push('=== SENTENCES ===');
let sTot = 0, sHit = 0;
for (const s of SENTENCES) {
  const heard = await stt(await synth(s));
  const f = heardFraction(s, heard);
  sTot++; if (f >= 0.5) sHit++;
  lines.push(`${(f * 100).toFixed(0).padStart(3)}%  "${s}"\n        heard: "${heard}"`);
}
lines.push(`sentences ≥50% heard: ${sHit}/${sTot}`);
lines.push('');
lines.push('=== WORDS ===');
const bad: string[] = [];
for (const w of WORDS) {
  const heard = await stt(await synth(w));
  const ok = norm(heard) === norm(w) || heardFraction(w, heard) >= 0.5;
  if (!ok) bad.push(`${w} -> "${heard}"`);
}
lines.push(`words misheard: ${bad.length}/${WORDS.length}`);
for (const b of bad) lines.push('  ' + b);
writeFileSync('/tmp/opencode/battery-report.txt', lines.join('\n'));
console.log(lines.join('\n'));