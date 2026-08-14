import type { ChatTurn, ServiceStatus, SttResult } from '../../shared/types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function postStt(blob: Blob): Promise<SttResult> {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  return fetch('/api/stt', { method: 'POST', body: form }).then((r) => json<SttResult>(r));
}

export function postChat(transcript: string): Promise<ChatTurn> {
  return fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  }).then((r) => json<ChatTurn>(r));
}

export function getHistory(): Promise<ChatTurn[]> {
  return fetch('/api/chat').then((r) => json<ChatTurn[]>(r));
}

export function clearHistory(): Promise<void> {
  return fetch('/api/chat', { method: 'DELETE' }).then(() => undefined);
}

export function getStatus(): Promise<ServiceStatus> {
  return fetch('/api/status').then((r) => json<ServiceStatus>(r));
}

export interface PromptInfo {
  prompt: string;
  default: string;
  custom: boolean;
}

export function getPrompt(): Promise<PromptInfo> {
  return fetch('/api/prompt').then((r) => json<PromptInfo>(r));
}

export function putPrompt(prompt: string): Promise<PromptInfo> {
  return fetch('/api/prompt', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  }).then((r) => json<PromptInfo>(r));
}

export function resetPrompt(): Promise<PromptInfo> {
  return fetch('/api/prompt', { method: 'DELETE' }).then((r) => json<PromptInfo>(r));
}

export async function synthSpeech(text: string): Promise<Blob> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.blob();
}