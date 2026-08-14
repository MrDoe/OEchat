import { Router } from 'express';
import { synthesize, ttsInput, wavToMp3 } from '../tts.js';

const router = Router();

const cache = new Map<string, Buffer>();

router.post('/', async (req, res, next) => {
  try {
    const { text } = req.body as { text?: unknown };
    const raw = typeof text === 'string' ? text.trim() : '';
    if (!raw) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const input = ttsInput(raw);
    let mp3 = cache.get(input);
    if (!mp3) {
      const wav = await synthesize(input);
      mp3 = wavToMp3(wav);
      if (cache.size > 500) cache.clear();
      cache.set(input, mp3);
    }
    res.type('audio/mpeg');
    res.send(mp3);
  } catch (err) {
    next(err);
  }
});

export default router;