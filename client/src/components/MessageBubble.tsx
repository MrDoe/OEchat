import { useState } from 'react';
import type { ChatTurn } from '../../../shared/types';
import { synthSpeech } from '../api';
import { playBlob, stopAudio } from '../audio';

interface MessageBubbleProps {
  message: ChatTurn;
  muted: boolean;
}

export function MessageBubble({ message, muted }: MessageBubbleProps) {
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  const isBot = message.role === 'bot';

  async function replay() {
    if (!message.oe) return;
    setPlaying(true);
    setPlayError(null);
    try {
      const blob = await synthSpeech(message.oe);
      await playBlob(blob);
    } catch (err) {
      setPlayError(err instanceof Error ? err.message : 'TTS failed');
    } finally {
      setPlaying(false);
    }
  }

  return (
    <div className={`bubble ${isBot ? 'bot' : 'user'}`}>
      {isBot ? (
        <>
          <p className="oe">{message.oe}</p>
          <p className="gloss">{message.gloss}</p>
          <div className="bubble-actions">
            {!muted && (
              <button
                type="button"
                className="speak-btn"
                onClick={() => {
                  stopAudio();
                  void replay();
                }}
                disabled={playing}
                aria-label="Hear this reply"
              >
                {playing ? '…' : '▶ hear'}
              </button>
            )}
            {playError && <span className="play-error">{playError}</span>}
          </div>
        </>
      ) : (
        <p className="transcript">{message.transcript}</p>
      )}
    </div>
  );
}