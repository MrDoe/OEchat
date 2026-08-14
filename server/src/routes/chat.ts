import { Router, type Request } from 'express';
import { randomUUID } from 'node:crypto';
import { buildMessages, chatReply } from '../llm.js';
import type { ChatTurn } from '../../../shared/types';

const router = Router();

function sessionTurns(req: Request): ChatTurn[] {
  return req.session.turns ?? [];
}

router.get('/', (req, res) => {
  res.json(sessionTurns(req));
});

router.post('/', async (req, res, next) => {
  try {
    const { transcript } = req.body as { transcript?: unknown };
    const text = typeof transcript === 'string' ? transcript.trim() : '';
    if (!text) {
      res.status(400).json({ error: 'transcript is required' });
      return;
    }
    const turns = sessionTurns(req);
    const reply = await chatReply(buildMessages(turns, text));
    const userTurn: ChatTurn = { id: randomUUID(), role: 'user', transcript: text, ts: Date.now() };
    const botTurn: ChatTurn = { id: randomUUID(), role: 'bot', oe: reply.oe, gloss: reply.gloss, ts: Date.now() };
    req.session.turns = [...turns, userTurn, botTurn].slice(-40);
    res.json(botTurn);
  } catch (err) {
    next(err);
  }
});

router.delete('/', (req, res) => {
  req.session.turns = [];
  res.json({ ok: true });
});

export default router;