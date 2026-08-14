import { Router } from 'express';
import multer from 'multer';
import { correctTranscript } from '../../../shared/oedict.js';
import { toWav16k, transcribe, whisperOnline } from '../stt.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'no audio file received' });
      return;
    }
    if (!(await whisperOnline())) {
      res.status(503).json({ error: 'whisper server is not running' });
      return;
    }
    const wav = toWav16k(req.file.buffer);
    const transcript = await transcribe(wav);
    res.json({ transcript, oe: transcript ? correctTranscript(transcript) : undefined });
  } catch (err) {
    next(err);
  }
});

export default router;