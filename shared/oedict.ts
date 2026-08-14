// Old English pronunciation dictionary and transliteration helpers.
//
// `oedict.json` is generated from elderlingo's hand-curated entries by
// `scripts/sync-dict.ts` (word, IPA, and German-orthography reference forms).
//
// TTS uses an internal phonetic script per the `altenglisch-lautschrift`
// skill: OE text is first canonicalized against the lexicon (correct OE form
// with vowel lengths), then converted to German-readable Lautschrift by
// mechanical rules, which the local Chatterbox narrator (cloned from an Old
// English reference voice) pronounces with German phonology — producing the
// closest authentic Old English sound.

import dict from './oedict.json';

export interface DictEntry {
  word: string;
  ipa: string;
  meaning: string;
  ttsEn: string;
  ttsDe: string;
}

interface OedictFile {
  source: string;
  entries: DictEntry[];
}

const data = dict as OedictFile;

export const LEXICON: DictEntry[] = data.entries;

const byKey = new Map<string, DictEntry>();
for (const entry of LEXICON) byKey.set(normalizeKey(entry.word), entry);

const phrases = LEXICON.filter((e) => e.word.includes(' ')).sort(
  (a, b) => b.word.split(' ').length - a.word.split(' ').length,
);

// "hāl" -> "hal", "þū" -> "thu", "ċild" -> "cild"
export function normalizeKey(s: string): string {
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
    .replace(/[æǣǽ]/g, 'ae')
    .replace(/[þð]/g, 'th')
    .replace(/[^a-z0-9]+/g, ' ');
}

// Lautschrift conversion per the `altenglisch-lautschrift` skill: Old English
// -> German-readable phonetic script (deterministic mechanical rules). The
// Chatterbox narrator is a learned multilingual BPE model, so it pronounces
// these German-style graphemes like a trained German reader.
//
// Rules (order matters):
//   1. x -> ks; cc -> kk; sc -> sch; cg -> dsch
//   2. c: ċ / palatal (adjacent to e, i, æ) -> tsch; otherwise k
//   3. g: ġ / palatal -> j; otherwise g
//   4. long diphthongs: ēa/eá -> éa, ēo/eó -> éo, īe/íe -> íe
//   5. long vowels doubled: ā->aa, ǣ->ää, ē->eh, ī->ii, ō->oo, ū->uu, ȳ->üü
//      short: æ -> ä, y -> ü
//   6. h: word-initial -> h, otherwise -> ch
//   7. fricatives: single f/þ/s between voiced sounds -> v/ð/s, else
//      f/þ/ß (doubled and word-edge fricatives stay voiceless)
//   8. TTS pass: þ/ð -> th (the tokenizer knows English "th"; the skill keeps
//      þ/ð for human readers)
//
// TTS adaptations (measured against the Chatterbox tokenizer):
//   - long ē -> "eh" (German /eː/); "ee" is read as English /iː/ ("see"->/siː/)
//   - word-initial voiceless s -> plain "s" ("ß"+front vowel garbles, e.g.
//     "ßee" -> "Ess-Ih"; the skill's ß stays for non-initial voiceless s)
//   - ß is never uppercased ("ß"->"SS" garbles: "Se"->"SSee"->"S.C.")
const SCH = '\uE000';
const DSCH = '\uE001';
const TSCHE = '\uE002';
const S_VOICED = '\uE003';
const S_INITIAL = '\uE004';
const EH_H = '\uE005';
const E_DIPH = '\uE006';
const I_DIPH = '\uE007';

const FRONT = 'eēiīæǣǽ';
const VOICED = 'aäáàeéèiíoóòuúùüömnlgjvwrbdz';

export function toLautschriftWord(input: string): string {
  // lowercase first: the rules are lowercase-only (Ælfred, Ūs, …), callers
  // re-capitalize the first letter via capitalizeLautschrift
  let w = input.toLowerCase();
  w = w.replace(/cc/g, 'kk');
  w = w.replace(/sc/g, SCH);
  w = w.replace(/cg/g, DSCH);
  w = w.replace(/ċ/g, TSCHE);
  w = w.replace(/(?<=[eēiīæǣǽ])lc$/g, `l${TSCHE}`);
  w = w.replace(new RegExp(`(?<=[${FRONT}])c`, 'g'), TSCHE);
  w = w.replace(new RegExp(`c(?=[${FRONT}])`, 'g'), TSCHE);
  w = w.replace(/c/g, 'k');
  w = w.replace(/ġ/g, 'j');
  // g: palatal only when word-initial before a front vowel, word-final after
  // one, or flanked by front vowels on both sides (medial g between/mixed
  // vowels stays g — e.g. nigon, fugol, eage; the skill flags this Gray Zone)
  w = w.replace(new RegExp(`^g(?=[${FRONT}])`, 'g'), 'j');
  w = w.replace(new RegExp(`(?<=[${FRONT}])g$`, 'g'), 'j');
  w = w.replace(new RegExp(`(?<=[${FRONT}])g(?=[${FRONT}])`, 'g'), 'j');
  w = w.replace(/ēa|eá/g, 'éa');
  w = w.replace(/ēo|eó/g, 'éo');
  w = w.replace(/īe|íe/g, 'íe');
  // protect the long-diphthong markers so the acute-vowel rules below
  // ("é" in éa/éo, "í" in íe) are not consumed
  w = w.replace(/é(?=[ao])/g, E_DIPH);
  w = w.replace(/í(?=e)/g, I_DIPH);
  // long vowels doubled (macron and acute spellings); æ -> ä, y -> ü
  w = w.replace(/[ǣǽ]/g, 'ää');
  w = w.replace(/[āá]/g, 'aa');
  w = w.replace(/[ēé]/g, `e${EH_H}`);
  w = w.replace(/[īí]/g, 'ii');
  w = w.replace(/[ōó]/g, 'oo');
  w = w.replace(/[ūú]/g, 'uu');
  w = w.replace(/[ȳý]/g, 'üü');
  w = w.replace(/æ/g, 'ä');
  w = w.replace(/y/g, 'ü');
  w = w.charAt(0) + w.slice(1).replace(/h/g, 'ch');
  w = w.replace(/^s/, S_INITIAL);
  w = w.replace(new RegExp(`(?<=[${VOICED}])f(?=[${VOICED}])`, 'g'), 'v');
  w = w.replace(new RegExp(`(?<=[${VOICED}])þ(?=[${VOICED}])`, 'g'), 'ð');
  w = w.replace(new RegExp(`(?<=[${VOICED}])s(?=[${VOICED}])`, 'g'), S_VOICED);
  w = w.replace(/s/g, 'ß');
  w = w.replace(new RegExp(SCH, 'g'), 'sch');
  w = w.replace(new RegExp(DSCH, 'g'), 'dsch');
  w = w.replace(new RegExp(TSCHE, 'g'), 'tsch');
  w = w.replace(new RegExp(S_VOICED, 'g'), 's');
  w = w.replace(new RegExp(S_INITIAL, 'g'), 's');
  w = w.replace(new RegExp(EH_H, 'g'), 'h');
  w = w.replace(new RegExp(E_DIPH, 'g'), 'é');
  w = w.replace(new RegExp(I_DIPH, 'g'), 'í');
  w = w.replace(/[þð]/g, 'th');
  return w;
}

// "ß" uppercases to "SS" in JS, which the tokenizer reads as letter names
// ("Se" -> "SSee" -> "Ess-Ih"); ß never starts a word in the TTS script, so
// leave it untouched when capitalized.
function capitalizeLautschrift(s: string): string {
  return s.charAt(0) === 'ß' ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function stripPunct(w: string): { lead: string; core: string; tail: string } {
  const m = w.match(/^([^A-Za-z\u00C0-\u024F]*)([A-Za-z\u00C0-\u024F].*?[A-Za-z\u00C0-\u024F]?)([^A-Za-z\u00C0-\u024F]*)$/);
  if (!m) return { lead: w, core: '', tail: '' };
  return { lead: m[1] ?? '', core: m[2] ?? '', tail: m[3] ?? '' };
}

// Old English text -> Lautschrift (internal phonetic script) for the Chatterbox
// narrator. Stage 1: canonicalize via the lexicon (correct OE form with vowel
// lengths, longest phrase first); stage 2: mechanical skill rules per word.
export function transliterate(input: string): string {
  const parts = input.split(/(\s+)/);
  const tokens = parts.map((p) => {
    const s = stripPunct(p);
    return { raw: p, isWord: s.core.length > 0, ...s };
  });

  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok.isWord) {
      out.push(tok.raw);
      i++;
      continue;
    }
    // longest phrase match over the next word tokens (whitespace between
    // them is collapsed; punctuation rides along on the first/last word)
    const wordTokens = tokens.slice(i).filter((t) => t.isWord);
    let matched = false;
    for (const phrase of phrases) {
      const n = phrase.word.split(' ').length;
      if (wordTokens.length < n) continue;
      const joined = wordTokens.slice(0, n).map((t) => t.core).join(' ');
      if (normalizeKey(joined) !== normalizeKey(phrase.word)) continue;
      let consumed = 0;
      let wordsSeen = 0;
      for (let j = i; j < tokens.length && wordsSeen < n; j++) {
        consumed++;
        if (tokens[j].isWord) wordsSeen++;
      }
      const lastWord = tokens[i + consumed - 1];
      const words = phrase.word.split(' ');
      let tts = words.map((wd, idx) => {
        let lw = toLautschriftWord(wd);
        if (idx === 0 && tok.core[0] !== undefined && tok.core[0] === tok.core[0].toUpperCase()) {
          lw = capitalizeLautschrift(lw);
        }
        return lw;
      }).join(' ');
      out.push(tok.lead + tts + lastWord.tail);
      i += consumed;
      matched = true;
      break;
    }
    if (matched) continue;
    const entry = byKey.get(normalizeKey(tok.core));
    const source = entry ? entry.word : tok.core;
    let tts = toLautschriftWord(source);
    if (tok.core[0] !== undefined && tok.core[0] === tok.core[0].toUpperCase()) {
      tts = capitalizeLautschrift(tts);
    }
    out.push(tok.lead + tts + tok.tail);
    i++;
  }
  return out.join('');
}

// Best-effort fix-up of whisper's output (which is modern-English-like, since
// Whisper has no Old English): map mis-heard words back to Old English.
// Used for English-mode transcripts (WHISPER_LANG=en).
const FIXES: [string, string][] = [
  ['i am', 'iċ eom'],
  ["i'm", 'iċ eom'],
  ['we are', 'wē sindon'],
  ['you are', 'þū eart'],
  ['they are', 'hīe sindon'],
  ['good morning', 'god morgen'],
  ['good night', 'gode niht'],
  ['thank you', 'þancie þē'],
  ['my name is', 'mīn nama is'],
  ['was hal', 'wes hāl'],
  ['was', 'wes'],
  ['hal', 'hāl'],
  ['hale', 'hāle'],
  ['healthy', 'hāl'],
  ['the', 'sē'],
  ['a', 'ān'],
  ['yes', 'ġēa'],
  ['no', 'nese'],
  ['hello', 'wes hāl'],
  ['goodbye', 'wes hāl'],
  ['farewell', 'wes hāl'],
  ['how', 'hū'],
  ['what', 'hwæt'],
  ['where', 'hwǣr'],
  ['why', 'hwy'],
  ['who', 'hwā'],
  ['when', 'hwænne'],
  ['is', 'is'],
  ['are', 'sindon'],
  ['my', 'mīn'],
  ['your', 'þīn'],
  ['name', 'nama'],
  ['friend', 'frēond'],
  ['day', 'dæġ'],
  ['night', 'niht'],
  ['morning', 'morgen'],
  ['water', 'wæter'],
  ['bread', 'hlāf'],
  ['house', 'hūs'],
  ['king', 'cyning'],
  ['queen', 'cwēn'],
  ['man', 'mann'],
  ['woman', 'wīf'],
  ['word', 'word'],
  ['soul', 'sāwol'],
  ['gold', 'gold'],
  ['wolf', 'wulf'],
  ['horse', 'hors'],
  ['dog', 'hund'],
  ['bird', 'fugol'],
  ['fish', 'fisc'],
  ['song', 'sang'],
  ['god', 'god'],
  ['father', 'fæder'],
  ['mother', 'mōdor'],
  ['brother', 'brōþor'],
  ['sister', 'sweostor'],
  ['son', 'sunu'],
  ['daughter', 'dohtor'],
  ['be well', 'wes hāl'],
];

// Token-based fixes: exact ASCII key matches only, so Old English output
// (with diacritics) is never re-matched.
const singleFixes = new Map<string, string>();
const multiFixes: [string, string][] = [];
for (const [src, dst] of FIXES) {
  if (src.includes(' ')) multiFixes.push([src, dst]);
  else singleFixes.set(src, dst);
}
multiFixes.sort((a, b) => b[0].split(' ').length - a[0].split(' ').length);

export function correctTranscript(raw: string): string {
  const tokens = raw.split(/(\s+)/);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    const s = stripPunct(tok);
    if (!s.core) {
      out.push(tok);
      i++;
      continue;
    }
    let matched = false;
    for (const [src, dst] of multiFixes) {
      const n = src.split(' ').length;
      const wordToks: { core: string; tail: string }[] = [];
      for (let j = i; j < tokens.length && wordToks.length < n; j++) {
        const t = stripPunct(tokens[j]);
        if (t.core) wordToks.push(t);
      }
      if (wordToks.length < n) continue;
      if (wordToks.map((t) => t.core.toLowerCase()).join(' ') !== src) continue;
      let consumed = 0;
      let words = 0;
      for (let j = i; j < tokens.length && words < n; j++) {
        consumed++;
        if (stripPunct(tokens[j]).core) words++;
      }
      out.push(s.lead + dst + wordToks[wordToks.length - 1].tail);
      i += consumed;
      matched = true;
      break;
    }
    if (matched) continue;
    const fix = singleFixes.get(s.core.toLowerCase());
    out.push(s.lead + (fix ?? s.core) + s.tail);
    i++;
  }
  return out.join('').trim();
}

// Old English -> English wordlist for the LLM's system prompt.
export function vocabularyBlock(): string {
  return LEXICON.map((e) => `${e.word} = ${e.meaning}`).join('\n');
}

// ---------------------------------------------------------------------------
// German-mode reverse mapping.
//
// The whisper service runs with language=de for OEchat: the user speaks
// German-phonology Old English, and the narrator is a German-trained voice,
// so German orthography is far closer to the actual sound than English is
// ("Hwär is seh wäter?" vs. "Hwæ is se wētā?"). This also fixes minimal
// pairs the English mode collapses ("würd" vs "word").
//
// `germanToOE` maps the German transcript back to Old English script:
//   1. German word map for particles and ASR spellings ("ist"->is,
//      "würd"->wyrd, "swither"->swīþe)
//   2. exact phone-key match against every lexicon word's Lautschrift form
//   3. edit-distance match (fuzzy, threshold by length)
//   4. mechanical inverse of `toLautschriftWord` as fallback
// Consecutive repeated segments (whisper echo artifacts) are collapsed.
// ---------------------------------------------------------------------------

const GERMAN_FIXES: [string, string][] = [
  ['ist', 'is'],
  ['isst', 'is'],
  ['das', 'þæt'],
  ['dass', 'þæt'],
  ['that', 'þæt'],
  ['theät', 'þæt'],
  ['sät', 'þæt'],
  ['ayt', 'þæt'],
  ['was', 'hwæt'],
  ['du', 'þū'],
  ['bist', 'eart'],
  ['bin', 'eom'],
  ['sind', 'sindon'],
  ['wir', 'wē'],
  ['und', 'and'],
  ['die', 'sē'],
  ['der', 'sē'],
  ['theät', 'þæt'],
  ['sit', 'sit'],
  ['wie', 'hū'],
  ['gut', 'gōd'],
  ['guter', 'gōd'],
  ['gute', 'gōd'],
  ['gude', 'gōd'],
  ['mann', 'mann'],
  ['man', 'mann'],
  ['name', 'nama'],
  ['hier', 'hēr'],
  ['ich', 'iċ'],
  ['itch', 'iċ'],
  ['ichn', 'iċ'],
  ['wort', 'word'],
  ['würd', 'wyrd'],
  ['wurd', 'wyrd'],
  ['örd', 'wyrd'],
  ['wird', 'wyrd'],
  ['sanchi', 'þancie'],
  ['swither', 'swīþe'],
  ['swali', 'swīþe'],
  ['svali', 'swīþe'],
  ['bēoth', 'bēoþ'],
  ['beoth', 'bēoþ'],
  ['blīþe', 'blīþe'],
  ['blithe', 'blīþe'],
  ['bliithe', 'blīþe'],
  ['gawdward', 'gōd word'],
  ['hal', 'hāl'],
  ['aal', 'eall'],
  ['hier', 'hēr'],
  ['hehr', 'hēr'],
  ['heh', 'hēr'],
  ['hēr', 'hēr'],
  ['mid', 'mid'],
  ['and', 'and'],
  ['on', 'on'],
  ['in', 'in'],
  ['dein', 'þīn'],
  ['deine', 'þīn'],
  ['mein', 'mīn'],
  ['meine', 'mīn'],
  ['meh', 'mē'],
  ['me', 'mē'],
  ['mē', 'mē'],
  ['thu', 'þū'],
  ['tha', 'þæt'],
  ['wees', 'wes'],
];

// Exact-string matches checked before the phone-key index: these German
// spellings collapse to the same phone key as other entries (the/thä/thää ->
// "the"), so edit-distance matching alone cannot tell them apart.
const GERMAN_EXACT: [string, string][] = [
  ['the', 'þē'],
  ['thä', 'þǣ'],
  ['thää', 'þǣre'],
  ['thääre', 'þǣre'],
  ['sät', 'þæt'],
  ['ayt', 'þæt'],
  ['will', 'wilt'],
  ['willt', 'wilt'],
  ['wilt', 'wilt'],
  ['siton', 'sit'],
  ['theers', 'þǣre'],
  ['theer', 'þǣre'],
  ['wer', 'hwǣr'],
  ['isse', 'is'],
  ['thantschie', 'þancie'],
  ['theh', 'þē'],
  ['thiis', 'is'],
  ['sitth', 'sitþ'],
  ['sith', 'sitþ'],
  ['an', 'on'],
  ['huaart', 'hū eart'],
  ['huart', 'hū eart'],
  ['hwuaart', 'hū eart'],
  ['zuh', 'þū'],
  ['iom', 'eom'],
  ['eilfrid', 'Ælfred'],
  ['ilfröd', 'Ælfred'],
  ['bleoth', 'blīþe'],
  ['miduseld', 'meduseld'],
  ['græat', 'grēat'],
  ['gret', 'grēat'],
  ['gréat', 'grēat'],
  ['aïsa', 'is se'],
  ['æl', 'and'],
];
const germanExactMap = new Map<string, string>();
for (const [src, dst] of GERMAN_EXACT) germanExactMap.set(src, dst);

// German phone key: normalizes both Lautschrift and whisper's German
// orthography into a comparison key (w=[v], ß=ss, ä/æ=[e], ü=[u], ö=[o],
// tsch/sch/ch=[k], doubled letters collapse, length lost).
export function deKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[þð]/g, 'th')
    .replace(/ß/g, 'ss')
    .replace(/tsch/g, 'k')
    .replace(/sch/g, 'k')
    .replace(/ch/g, 'k')
    .replace(/ck/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/qu/g, 'kw')
    .replace(/ä/g, 'e')
    .replace(/[æǣǽ]/g, 'e')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/[āáàâ]/g, 'a')
    .replace(/[ēéèê]/g, 'e')
    .replace(/[īí]/g, 'i')
    .replace(/[ōó]/g, 'o')
    .replace(/[ūú]/g, 'u')
    .replace(/[ȳýÿ]/g, 'i')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/ie/g, 'i')
    .replace(/ei/g, 'e')
    .replace(/([a-z0-9])\1+/g, '$1');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

// {phoneKey, word} for every lexicon word (Lautschrift form) plus the German
// word map; built lazily.
let reverseIndex: { key: string; word: string }[] | null = null;
export function getReverseIndex(): { key: string; word: string }[] {
  if (reverseIndex) return reverseIndex;
  const idx: { key: string; word: string }[] = [];
  const seen = new Set<string>();
  for (const e of LEXICON) {
    for (const form of [e.word, toLautschriftWord(e.word)]) {
      const key = deKey(form);
      if (!seen.has(key)) {
        seen.add(key);
        idx.push({ key, word: e.word });
      }
    }
  }
  for (const [src, dst] of GERMAN_FIXES) {
    const key = deKey(src);
    if (!seen.has(key)) {
      seen.add(key);
      idx.push({ key, word: dst });
    }
  }
  reverseIndex = idx;
  return idx;
}

// Longest-match-first inverse of the mechanical Lautschrift rules, for
// words the lexicon does not know (names, inflections). Best-effort.
const INVERSE_RULES: [RegExp, string][] = [
  [/tsch/g, 'ċ'],
  [/dsch/g, 'cg'],
  [/sch/g, 'sc'],
  [/ch/g, 'h'],
  [/th/g, 'þ'],
  [/qu/g, 'cw'],
  [/ph/g, 'f'],
  [/ck/g, 'c'],
  [/kk/g, 'c'],
  [/ää/g, 'ǣ'],
  [/aa/g, 'ā'],
  [/eh/g, 'ē'],
  [/ii/g, 'ī'],
  [/oo/g, 'ō'],
  [/uu/g, 'ū'],
  [/üü/g, 'ȳ'],
  [/éa/g, 'ēa'],
  [/éo/g, 'ēo'],
  [/íe/g, 'īe'],
  [/é/g, 'ē'],
  [/í/g, 'ī'],
  [/ä/g, 'æ'],
  [/ü/g, 'y'],
  [/ß/g, 's'],
  [/j/g, 'ġ'],
  [/v/g, 'f'],
  [/k/g, 'c'],
];

export function inverseLautschrift(token: string): string {
  let w = token.toLowerCase();
  for (const [re, rep] of INVERSE_RULES) w = w.replace(re, rep);
  w = w.replace(/ēh/g, 'ē');
  w = w.replace(/([\p{L}])\1/gu, '$1');
  return w;
}

// Match a whisper token against the reverse index with a length-aware
// edit-distance budget (exact for short tokens, up to 2 edits for longer).
export function matchGermanToken(token: string): { word: string; dist: number } | null {
  const key = deKey(token);
  const idx = getReverseIndex();
  let best: { word: string; dist: number } | null = null;
  for (const cand of idx) {
    let dist: number;
    if (cand.key === key) dist = 0;
    else dist = levenshtein(key, cand.key);
    const budget = key.length >= 5 ? 2 : key.length >= 3 ? 1 : 0;
    if (dist > budget) continue;
    if (!best || dist < best.dist) best = { word: cand.word, dist };
  }
  return best;
}

// German-mode transcript -> Old English script.
export function germanToOE(raw: string): string {
  const tokens = raw.split(/(\s+)/);
  const words = tokens.filter((t) => /[A-Za-z\u00C0-\u024F]/.test(t));
  const half = Math.floor(words.length / 2);
  // whisper echo artifacts: the same sentence twice, often with slight
  // token variation ("seh … soh …", "wilt … will …") — collapse the second
  // half when each token is within one phone-key edit of its twin
  let dup = false;
  if (words.length >= 6 && words.length % 2 === 0) {
    dup = true;
    for (let i = 0; i < half; i++) {
      if (levenshtein(deKey(words[i]), deKey(words[half + i])) > 1) {
        dup = false;
        break;
      }
    }
  }

  const out: string[] = [];
  let wordIdx = 0;
  for (const tok of tokens) {
    const s = stripPunct(tok);
    if (!s.core) {
      out.push(tok);
      continue;
    }
    let w = s.core;
    if (dup && wordIdx >= half) continue;
    const exact = germanExactMap.get(w.toLowerCase());
    const match = exact ? { word: exact, dist: 0 } : matchGermanToken(w);
    let outW = match ? match.word : inverseLautschrift(w);
    if (s.core[0] === s.core[0].toUpperCase()) outW = capitalizeLautschrift(outW);
    out.push(s.lead + outW + s.tail);
    wordIdx++;
  }
  let result = out.join('').replace(/\s+/g, ' ').trim();
  // whisper echo of an isolated word ("word word word") — keep one copy
  const outTokens = result.split(/\s+/);
  if (outTokens.length >= 3 && outTokens.every((t) => t === outTokens[0])) {
    result = outTokens[0];
  }
  return result;
}
