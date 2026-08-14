// The chatbot brain: ollama + gemma4:12b, prompted to reply in simple
// Old English with an English gloss, as strict JSON. The system prompt is
// editable from the GUI (see prompt.ts); without an override the built-in
// default below is used.
import { LEXICON, normalizeKey, vocabularyBlock } from '../../shared/oedict.js';
import { getPromptOverride } from './prompt.js';
import type { ChatTurn } from '../../shared/types';

export const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
export const LLM_MODEL = process.env.LLM_MODEL ?? 'gemma4:12b';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// The default system prompt is sent with every chat turn, so it must stay
// token-lean. Only high-value conversational vocabulary goes into the prompt
// (subset of the full lexicon via normalized keys).
const CORE_VOCAB_KEYS = new Set([
  'wes hal', 'god morgen', 'þancie þe', 'ic eom hal', 'wes',
  'ic', 'thu', 'he', 'heo', 'we', 'ge', 'hie',
  'ic eom', 'thu eart', 'he is', 'heo is', 'hit is', 'we sindon', 'ge sindon', 'hie sindon',
  'hwæt', 'hu', 'hwær', 'hwa', 'hwy',
  'an', 'twa', 'þrie', 'feower', 'fif', 'siex', 'seofon', 'eahta', 'nigon', 'tien',
  'nama', 'freond', 'hus', 'hlaf', 'wæter', 'ealu', 'medu', 'cyning', 'cwen', 'mann', 'wif',
  'dæg', 'niht', 'morgen', 'wulf', 'hund', 'fugol', 'fisc', 'sang', 'word', 'wyrd', 'boc', 'lif',
  'eorþe', 'heofon', 'sunne', 'mona', 'treow', 'wudu', 'hors', 'land',
  'god', 'leof', 'cwic', 'gesund', 'swiþe', 'wel', 'soþ', 'ealle',
  'min', 'þin', 'nu', 'þa', 'se', 'gea', 'nese',
  'sprecan', 'secgan', 'hieran', 'seon', 'cuman', 'gan', 'etan', 'drincan', 'lufian', 'biddan',
]);

function coreVocabularyBlock(): string {
  return LEXICON.filter((e) => CORE_VOCAB_KEYS.has(normalizeKey(e.word)))
    .map((e) => `${e.word} = ${e.meaning}`)
    .join('\n');
}

const EXTRA_VOCAB = `
ic bidde = please
gode niht = good night
hwæt hātest þū? = what are you called?
iċ hāte = I am called
hū gǣþ hit? = how goes it?
Englisc = English (language)
lēornian = to learn
witan = to know
þencan = to think
þing = thing
hwæt þencest þū? = what do you think?
þæt is gōd = that is good
þæt is wunderlīc = that is wonderful
iċ ne cann = I cannot / I do not know how
ne secge iċ = I do not say
`;

export function defaultSystemPrompt(): string {
  return `You are "Se Lēodwita" (the language-scholar): warm, witty Old English (early West Saxon, 9th c.) conversation partner for learners.

Rules:
- Reply ONLY in Old English, simple and grammatical.
- Normally keep it short: 1-3 sentences. BUT if the user asks for more — e.g. "tell me more", "more", "saga mā", "mā" — answer generously with 5-7 sentences.
- Early West Saxon orthography: macrons (ā ē ī ō ū ȳ), ċ, ġ, þ/ð, æ.
- Use only the wordlist below; never invent pseudo-OE or mix in modern English; rephrase with known words when you lack one.
- Stay in character: allusions to mead, the hall, wyrd, riddles and the old gods welcome; never lecture or explain grammar.
- The user's speech recognition may garble OE into English-sounding text; interpret charitably. If truly unclear, ask "Hwæt cwǣde þū?".

Output JSON only, no markdown or commentary:
{"oe": "<Old English reply>", "gloss": "<short English translation>"}

Examples:
"was hal" → {"oe": "Wes hāl, frēond. Hū eart þū?", "gloss": "Be well, friend. How are you?"}
"tell me more about the mead hall" → {"oe": "Se meduseld is grēat sele; þǣr byrnþ fȳr ælċe niht and scopas singaþ eald sang under þǣm hrōfe. Wilt þū þæder gān mid mē?", "gloss": "The mead hall is a great hall; there a fire burns nightly and poets sing old songs under the roof. Do you want to go there with me?"}

Vocabulary (Old English = modern English):
${coreVocabularyBlock()}${EXTRA_VOCAB}`;
}

export function systemPrompt(): string {
  return getPromptOverride() ?? defaultSystemPrompt();
}

// Builds the ollama message list from the session history.
export function buildMessages(turns: ChatTurn[], transcript: string): OllamaMessage[] {
  const messages: OllamaMessage[] = [{ role: 'system', content: systemPrompt() }];
  for (const turn of turns.slice(-24)) {
    if (turn.role === 'user') {
      messages.push({ role: 'user', content: turn.transcript ?? '' });
    } else {
      messages.push({ role: 'assistant', content: turn.oe ?? '' });
    }
  }
  messages.push({ role: 'user', content: transcript });
  return messages;
}

// Ollama may wrap JSON in fences or append chatter; extract defensively.
export function parseJsonReply(content: string): { oe: string; gloss: string } | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { oe?: unknown; gloss?: unknown };
    if (typeof parsed.oe === 'string' && typeof parsed.gloss === 'string' && parsed.oe.trim()) {
      return { oe: parsed.oe.trim(), gloss: parsed.gloss.trim() };
    }
  } catch {
    // fall through
  }
  return null;
}

export async function ollamaOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function chatReply(messages: OllamaMessage[]): Promise<{ oe: string; gloss: string }> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      stream: false,
      format: 'json',
      think: false,
      options: { temperature: 0.7, top_p: 0.9, num_predict: 900, num_ctx: 4096 },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`ollama error ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { message?: { content?: string } };
  const content = body.message?.content ?? '';
  const parsed = parseJsonReply(content);
  if (!parsed) throw new Error('ollama returned malformed JSON reply');
  return parsed;
}