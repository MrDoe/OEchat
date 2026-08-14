import { useCallback, useRef, useState } from 'react';
import { cancelRecording, startRecording, stopRecording } from '../recorder';

interface MicButtonProps {
  onBlob: (blob: Blob) => void;
  disabled?: boolean;
}

export function MicButton({ onBlob, disabled }: MicButtonProps) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const armed = useRef(false);

  const begin = useCallback(async () => {
    if (disabled || armed.current) return;
    setError(null);
    try {
      await startRecording();
      armed.current = true;
      setRecording(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Mic denied — allow access or use the text input.'
          : name === 'NotFoundError'
            ? 'No microphone found.'
            : 'Could not start the microphone.',
      );
    }
  }, [disabled]);

  const finish = useCallback(
    async (cancelled: boolean) => {
      if (!armed.current) return;
      armed.current = false;
      setRecording(false);
      if (cancelled) {
        cancelRecording();
        return;
      }
      try {
        const blob = await stopRecording();
        if (blob.size > 0) onBlob(blob);
      } catch {
        setError('Recording was too short — hold the button while speaking.');
      }
    },
    [onBlob],
  );

  return (
    <div className="mic-wrap">
      <button
        type="button"
        className={`mic-btn ${recording ? 'recording' : ''}`}
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          void begin();
        }}
        onPointerUp={() => void finish(false)}
        onPointerLeave={() => void finish(false)}
        onPointerCancel={() => void finish(true)}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={recording ? 'Release to stop recording' : 'Hold to speak Old English'}
      >
        ᚦ
      </button>
      <span className="mic-hint">{recording ? 'Speaking… release to send' : 'Hold to speak'}</span>
      {error && <span className="mic-error">{error}</span>}
    </div>
  );
}