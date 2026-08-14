import { describe, expect, it } from 'vitest';
import { buildMessages, parseJsonReply } from '../src/llm.js';
import type { ChatTurn } from '../../shared/types';

describe('parseJsonReply', () => {
  it('parses plain JSON', () => {
    expect(parseJsonReply('{"oe": "Wes hāl.", "gloss": "Be well."}')).toEqual({
      oe: 'Wes hāl.',
      gloss: 'Be well.',
    });
  });

  it('strips markdown fences', () => {
    expect(parseJsonReply('```json\n{"oe": "Hū eart þū?", "gloss": "How are you?"}\n```')).toEqual({
      oe: 'Hū eart þū?',
      gloss: 'How are you?',
    });
  });

  it('extracts JSON from noisy output', () => {
    expect(
      parseJsonReply('Sure! {"oe": "God morgen.", "gloss": "Good morning."} -- hope that helps'),
    ).toEqual({ oe: 'God morgen.', gloss: 'Good morning.' });
  });

  it('returns null for malformed output', () => {
    expect(parseJsonReply('no json here')).toBeNull();
    expect(parseJsonReply('{"oe": "only oe"}')).toBeNull();
  });
});

describe('buildMessages', () => {
  it('prepends the system prompt and includes history', () => {
    const turns: ChatTurn[] = [
      { id: '1', role: 'user', transcript: 'wes hal', ts: 1 },
      { id: '2', role: 'bot', oe: 'Wes hāl!', gloss: 'Be well!', ts: 2 },
    ];
    const messages = buildMessages(turns, 'hū eart þū?');
    expect(messages).toHaveLength(4);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Lēodwita');
    expect(messages[1]).toEqual({ role: 'user', content: 'wes hal' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'Wes hāl!' });
    expect(messages[3]).toEqual({ role: 'user', content: 'hū eart þū?' });
  });
});