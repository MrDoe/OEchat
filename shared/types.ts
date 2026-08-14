export type ChatRole = 'user' | 'bot';

export interface ChatMessage {
  role: ChatRole;
  transcript?: string;
  oe?: string;
  gloss?: string;
}

export interface ChatTurn extends ChatMessage {
  id: string;
  ts: number;
}

export interface ChatReply {
  oe: string;
  gloss: string;
}

export interface SttResult {
  transcript: string;
  oe?: string;
}

export interface ServiceStatus {
  whisperOnline: boolean;
  chatterboxOnline: boolean;
  ollamaOnline: boolean;
}
