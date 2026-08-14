import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatRouter from './routes/chat.js';
import sttRouter from './routes/stt.js';
import ttsRouter from './routes/tts.js';
import statusRouter from './routes/status.js';
import promptRouter from './routes/prompt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'oechat-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 30 },
    }),
  );

  app.use('/api/chat', chatRouter);
  app.use('/api/stt', sttRouter);
  app.use('/api/tts', ttsRouter);
  app.use('/api/status', statusRouter);
  app.use('/api/prompt', promptRouter);

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('/*splat', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  });

  return app;
}