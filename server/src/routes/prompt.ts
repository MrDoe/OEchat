import { Router } from 'express';
import {
  getPromptOverride,
  resetPromptOverride,
  setPromptOverride,
} from '../prompt.js';
import { defaultSystemPrompt } from '../llm.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    prompt: getPromptOverride() ?? defaultSystemPrompt(),
    default: defaultSystemPrompt(),
    custom: getPromptOverride() !== null,
  });
});

router.put('/', (req, res) => {
  const { prompt } = req.body as { prompt?: unknown };
  if (typeof prompt !== 'string') {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }
  try {
    setPromptOverride(prompt);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'invalid prompt' });
    return;
  }
  res.json({ prompt: getPromptOverride() ?? '', custom: true });
});

router.delete('/', (_req, res) => {
  resetPromptOverride();
  res.json({ prompt: defaultSystemPrompt(), default: defaultSystemPrompt(), custom: false });
});

export default router;
