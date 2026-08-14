import 'express-session';
import type { ChatTurn } from '../../shared/types';

declare module 'express-session' {
  interface SessionData {
    turns?: ChatTurn[];
  }
}