// Seeds shared/oedict.json from elderlingo's hand-curated word entries
// (word, IPA, German-orthography TTS forms), then merges in extra common
// conversational Old English words curated here (EXTRA_ENTRIES below).
//
// Usage:
//   npm run sync-dict

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allEntries } from '../../elderlingo/content/units.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'shared', 'oedict.json');
const ELDERLINGO_DIR = path.resolve(__dirname, '..', '..', 'elderlingo');

interface Entry {
  word: string;
  ipa: string;
  meaning: string;
  ttsEn: string;
  ttsDe: string;
}

// Hand-curated additions for words the chatbot is likely to say but that are
// not in elderlingo's beginner lessons yet.
const EXTRA_ENTRIES: Entry[] = [
  { word: 'hwæt', ipa: 'hwæt', meaning: 'what; lo!', ttsEn: 'hwat', ttsDe: 'hwät' },
  { word: 'hū', ipa: 'huː', meaning: 'how', ttsEn: 'hoo', ttsDe: 'hoo' },
  { word: 'wes', ipa: 'wes', meaning: 'be (imp. sg.)', ttsEn: 'wess', ttsDe: 'wess' },
  { word: 'hwǣr', ipa: 'hwær', meaning: 'where', ttsEn: 'hwair', ttsDe: 'hwair' },
  { word: 'hwy', ipa: 'hwiː', meaning: 'why', ttsEn: 'hwee', ttsDe: 'hwee' },
  { word: 'hwā', ipa: 'hwɑː', meaning: 'who', ttsEn: 'hwah', ttsDe: 'hwah' },
  { word: 'mīn', ipa: 'miːn', meaning: 'my', ttsEn: 'meen', ttsDe: 'meen' },
  { word: 'þīn', ipa: 'θiːn', meaning: 'your', ttsEn: 'theen', ttsDe: 'theen' },
  { word: 'nama', ipa: 'ˈnɑ.mɑ', meaning: 'name', ttsEn: 'nah-mah', ttsDe: 'nah-mah' },
  { word: 'dæġ', ipa: 'dæj', meaning: 'day', ttsEn: 'day', ttsDe: 'däj' },
  { word: 'niht', ipa: 'nixt', meaning: 'night', ttsEn: 'nicht', ttsDe: 'nicht' },
  { word: 'morgen', ipa: 'ˈmor.jen', meaning: 'morning', ttsEn: 'mor-yen', ttsDe: 'morjen' },
  { word: 'wæter', ipa: 'ˈwæ.ter', meaning: 'water', ttsEn: 'wa-ter', ttsDe: 'wätter' },
  { word: 'hlāf', ipa: 'hlɑːf', meaning: 'bread', ttsEn: 'hlaaf', ttsDe: 'hlaaf' },
  { word: 'medu', ipa: 'ˈme.du', meaning: 'mead', ttsEn: 'meh-doo', ttsDe: 'medu' },
  { word: 'ealu', ipa: 'ˈæɑ.lu', meaning: 'ale', ttsEn: 'eh-ah-loo', ttsDe: 'ealu' },
  { word: 'hūs', ipa: 'huːs', meaning: 'house', ttsEn: 'hoos', ttsDe: 'hoos' },
  { word: 'land', ipa: 'lɑnd', meaning: 'land', ttsEn: 'lahnd', ttsDe: 'land' },
  { word: 'cyning', ipa: 'ˈky.niŋ', meaning: 'king', ttsEn: 'ku-ning', ttsDe: 'küning' },
  { word: 'cwēn', ipa: 'kweːn', meaning: 'queen', ttsEn: 'kveen', ttsDe: 'kveen' },
  { word: 'frēond', ipa: 'freːond', meaning: 'friend', ttsEn: 'freh-ohnd', ttsDe: 'freh-ohnd' },
  { word: 'bearn', ipa: 'bæɑrn', meaning: 'child', ttsEn: 'beh-arn', ttsDe: 'beh-arn' },
  { word: 'sōþ', ipa: 'soːθ', meaning: 'truth', ttsEn: 'sooth', ttsDe: 'sooth' },
  { word: 'wēl', ipa: 'weːl', meaning: 'well', ttsEn: 'weel', ttsDe: 'weel' },
  { word: 'nū', ipa: 'nuː', meaning: 'now', ttsEn: 'noo', ttsDe: 'noo' },
  { word: 'þā', ipa: 'θɑː', meaning: 'then', ttsEn: 'thah', ttsDe: 'thah' },
  { word: 'ġēa', ipa: 'jæɑ', meaning: 'yes', ttsEn: 'yeah', ttsDe: 'jeah' },
  { word: 'nese', ipa: 'ˈne.se', meaning: 'no', ttsEn: 'neh-seh', ttsDe: 'neh-seh' },
  { word: 'sē', ipa: 'seː', meaning: 'the (m.)', ttsEn: 'seh', ttsDe: 'seh' },
  { word: 'gōd', ipa: 'ɡoːd', meaning: 'good', ttsEn: 'goad', ttsDe: 'gott' },
  { word: 'gode', ipa: 'ˈɡo.de', meaning: 'good (d.)', ttsEn: 'go-deh', ttsDe: 'gott-eh' },
  { word: 'hlāford', ipa: 'ˈhlɑː.vord', meaning: 'lord', ttsEn: 'hlaaf-ort', ttsDe: 'hlaaf-ort' },
  { word: 'eorþe', ipa: 'ˈe.or.θe', meaning: 'earth', ttsEn: 'eh-or-theh', ttsDe: 'eh-or-theh' },
  { word: 'heofon', ipa: 'ˈheo.von', meaning: 'heaven, sky', ttsEn: 'heh-oh-fon', ttsDe: 'heh-oh-fon' },
  { word: 'sunne', ipa: 'ˈsun.ne', meaning: 'sun', ttsEn: 'sun-neh', ttsDe: 'sun-neh' },
  { word: 'mōna', ipa: 'ˈmoː.nɑ', meaning: 'moon', ttsEn: 'moh-nah', ttsDe: 'moh-nah' },
  { word: 'steorra', ipa: 'ˈste.or.rɑ', meaning: 'star', ttsEn: 'steh-or-rah', ttsDe: 'steh-or-rah' },
  { word: 'trēow', ipa: 'treːow', meaning: 'tree', ttsEn: 'treh-oh', ttsDe: 'treh-oh' },
  { word: 'wudu', ipa: 'ˈwu.du', meaning: 'wood', ttsEn: 'woo-doo', ttsDe: 'wudu' },
  { word: 'wulf', ipa: 'wulf', meaning: 'wolf', ttsEn: 'wulf', ttsDe: 'wulf' },
  { word: 'hors', ipa: 'hors', meaning: 'horse', ttsEn: 'hors', ttsDe: 'hors' },
  { word: 'hund', ipa: 'hund', meaning: 'dog', ttsEn: 'hund', ttsDe: 'hund' },
  { word: 'fugol', ipa: 'ˈfu.ɣol', meaning: 'bird', ttsEn: 'foo-gol', ttsDe: 'foo-gol' },
  { word: 'fisc', ipa: 'fiʃ', meaning: 'fish', ttsEn: 'fisk', ttsDe: 'fisk' },
  { word: 'sang', ipa: 'sɑŋɡ', meaning: 'song', ttsEn: 'sahng', ttsDe: 'sang' },
  { word: 'lēoþ', ipa: 'leːoθ', meaning: 'poem, song', ttsEn: 'leh-oth', ttsDe: 'leh-oth' },
  { word: 'bōc', ipa: 'boːk', meaning: 'book', ttsEn: 'bohk', ttsDe: 'bohk' },
  { word: 'word', ipa: 'word', meaning: 'word', ttsEn: 'wort', ttsDe: 'wort' },
  { word: 'wyrd', ipa: 'wyrd', meaning: 'fate, destiny', ttsEn: 'wuerd', ttsDe: 'würd' },
  { word: 'sāwol', ipa: 'ˈsɑː.wol', meaning: 'soul', ttsEn: 'sah-wol', ttsDe: 'sah-wol' },
  { word: 'sprecan', ipa: 'ˈspre.kɑn', meaning: 'to speak', ttsEn: 'spreh-kahn', ttsDe: 'sprekan' },
  { word: 'secgan', ipa: 'ˈsed.jɑn', meaning: 'to say', ttsEn: 'seg-jan', ttsDe: 'segjan' },
  { word: 'hīeran', ipa: 'ˈhiː.er.ɑn', meaning: 'to hear', ttsEn: 'hee-eh-ran', ttsDe: 'hee-eh-ran' },
  { word: 'sēon', ipa: 'seːon', meaning: 'to see', ttsEn: 'seh-ohn', ttsDe: 'seh-ohn' },
  { word: 'cuman', ipa: 'ˈku.mɑn', meaning: 'to come', ttsEn: 'koo-mahn', ttsDe: 'kuman' },
  { word: 'gān', ipa: 'ɡɑːn', meaning: 'to go', ttsEn: 'gahn', ttsDe: 'gahn' },
  { word: 'etan', ipa: 'ˈe.tɑn', meaning: 'to eat', ttsEn: 'eh-tahn', ttsDe: 'etan' },
  { word: 'drincan', ipa: 'ˈdriŋ.kɑn', meaning: 'to drink', ttsEn: 'drin-kahn', ttsDe: 'drinkan' },
  { word: 'lufian', ipa: 'ˈlu.fi.ɑn', meaning: 'to love', ttsEn: 'loo-fi-an', ttsDe: 'loo-fi-an' },
  { word: 'biddan', ipa: 'ˈbid.dɑn', meaning: 'to ask, to pray', ttsEn: 'bid-dahn', ttsDe: 'bid-dan' },
  { word: 'þanc', ipa: 'θɑŋk', meaning: 'thanks', ttsEn: 'thank', ttsDe: 'thank' },
  { word: 'mann', ipa: 'mɑnn', meaning: 'man, person', ttsEn: 'mahn', ttsDe: 'mann' },
  { word: 'wīġ', ipa: 'wiːj', meaning: 'war, battle', ttsEn: 'wee', ttsDe: 'wee' },
  { word: 'friþ', ipa: 'friθ', meaning: 'peace', ttsEn: 'frith', ttsDe: 'frith' },
  { word: 'ealle', ipa: 'ˈæɑl.le', meaning: 'all', ttsEn: 'al-leh', ttsDe: 'al-leh' },
  { word: 'līf', ipa: 'liːf', meaning: 'life', ttsEn: 'leef', ttsDe: 'leef' },
  { word: 'hāte', ipa: 'ˈhɑː.te', meaning: 'I am called; I command', ttsEn: 'haa-teh', ttsDe: 'haate' },
  { word: 'hātest', ipa: 'ˈhɑː.test', meaning: 'you are called', ttsEn: 'haa-test', ttsDe: 'haateßt' },
  { word: 'hāteþ', ipa: 'ˈhɑː.teθ', meaning: 'he/she is called', ttsEn: 'haa-teth', ttsDe: 'haateth' },
  { word: 'hātaþ', ipa: 'ˈhɑː.tɑθ', meaning: 'you/they are called', ttsEn: 'haa-tath', ttsDe: 'haatath' },
  { word: 'hātan', ipa: 'ˈhɑː.tɑn', meaning: 'to be called, to command', ttsEn: 'haa-tahn', ttsDe: 'haatan' },
];

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[āáàâ]/g, 'a')
    .replace(/[ēéèê]/g, 'e')
    .replace(/[īíìî]/g, 'i')
    .replace(/[ōóòô]/g, 'o')
    .replace(/[ūúùû]/g, 'u')
    .replace(/[ȳÿ]/g, 'y')
    .replace(/ċ/g, 'c')
    .replace(/ġ/g, 'g')
    .replace(/æ/g, 'ae')
    .replace(/[þð]/g, 'th')
    .replace(/[^a-z0-9]+/g, ' ');
}

const merged = new Map<string, Entry>();
for (const e of allEntries()) {
  merged.set(normalizeKey(e.word), { word: e.word, ipa: e.ipa, meaning: e.meaning, ttsEn: e.tts.en, ttsDe: e.tts.de });
}
let added = 0;
for (const e of EXTRA_ENTRIES) {
  const key = normalizeKey(e.word);
  if (!merged.has(key)) {
    merged.set(key, e);
    added++;
  }
}

const out = { source: ELDERLINGO_DIR, entries: [...merged.values()] };
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`✓ wrote ${OUT}: ${merged.size} entries (${added} extras)`);