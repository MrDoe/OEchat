// Persistent system-prompt override for the chatbot brain, editable from the
// GUI. Stored in server/data/system-prompt.txt (gitignored). When no override
// exists, llm.ts falls back to its built-in default prompt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_FILE = path.join(__dirname, '..', 'data', 'system-prompt.txt');
export const MAX_PROMPT_LENGTH = 20000;

let cached: string | null = null;

function readFile(): string | null {
  try {
    return fs.readFileSync(PROMPT_FILE, 'utf8').trim();
  } catch {
    return null;
  }
}

export function getPromptOverride(): string | null {
  if (cached === null) cached = readFile();
  return cached && cached.length > 0 ? cached : null;
}

export function setPromptOverride(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('system prompt must not be empty');
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new Error(`system prompt too long (max ${MAX_PROMPT_LENGTH} characters)`);
  }
  fs.mkdirSync(path.dirname(PROMPT_FILE), { recursive: true });
  fs.writeFileSync(PROMPT_FILE, trimmed);
  cached = trimmed;
  return trimmed;
}

export function resetPromptOverride(): void {
  fs.rmSync(PROMPT_FILE, { force: true });
  cached = null;
}