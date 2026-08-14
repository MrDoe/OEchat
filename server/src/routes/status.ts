import { Router } from 'express';
import { whisperOnline } from '../stt.js';
import { ollamaOnline } from '../llm.js';
import { chatterboxOnline } from '../tts.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [whisper, chatterbox, ollama] = await Promise.all([
    whisperOnline(),
    chatterboxOnline(),
    ollamaOnline(),
  ]);
  res.json({ whisperOnline: whisper, chatterboxOnline: chatterbox, ollamaOnline: ollama });
});

export default router;