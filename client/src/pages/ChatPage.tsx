import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatTurn, ServiceStatus } from '../../../shared/types';
import {
  clearHistory,
  getHistory,
  getPrompt,
  getStatus,
  postChat,
  postStt,
  putPrompt,
  resetPrompt,
  synthSpeech,
} from '../api';
import { playBlob, stopAudio } from '../audio';
import { MicButton } from '../components/MicButton';
import { MessageBubble } from '../components/MessageBubble';

const MUTE_KEY = 'oechat-muted';

export function ChatPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1');
  const [banner, setBanner] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [promptDefault, setPromptDefault] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);
  const [promptMsg, setPromptMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getHistory()
      .then(setMessages)
      .catch(() => undefined);
    const poll = () => {
      void getStatus().then(setStatus).catch(() => setStatus(null));
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      localStorage.setItem(MUTE_KEY, m ? '0' : '1');
      return !m;
    });
    stopAudio();
  }, []);

  const sendTranscript = useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text || busy) return;
      setBusy(true);
      setBanner(null);
      const userTurn: ChatTurn = { id: crypto.randomUUID(), role: 'user', transcript: text, ts: Date.now() };
      setMessages((m) => [...m, userTurn]);
      try {
        const reply = await postChat(text);
        setMessages((m) => [...m, reply]);
        if (!muted && reply.oe) {
          try {
            const blob = await synthSpeech(reply.oe);
            await playBlob(blob);
          } catch (err) {
            setBanner(err instanceof Error ? err.message : 'TTS failed — see server logs');
          }
        }
      } catch (err) {
        setBanner(err instanceof Error ? err.message : 'Chat request failed');
      } finally {
        setBusy(false);
      }
    },
    [busy, muted],
  );

  const onMicBlob = useCallback(
    async (blob: Blob) => {
      if (busy) return;
      setBusy(true);
      setBanner(null);
      try {
        const { transcript } = await postStt(blob);
        if (!transcript) {
          setBanner('Hērde iċ nāwiht — I heard nothing. Speak a little louder?');
          return;
        }
        await sendTranscript(transcript);
      } catch (err) {
        setBanner(err instanceof Error ? err.message : 'Speech recognition failed');
      } finally {
        setBusy(false);
      }
    },
    [busy, sendTranscript],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void sendTranscript(input);
      setInput('');
    },
    [input, sendTranscript],
  );

  const onClear = useCallback(() => {
    void clearHistory();
    setMessages([]);
  }, []);

  const openPromptEditor = useCallback(() => {
    setPromptMsg(null);
    setPromptDirty(false);
    void getPrompt()
      .then((info) => {
        setPromptText(info.prompt);
        setPromptDefault(info.default);
        setPromptOpen(true);
      })
      .catch((err) => setBanner(err instanceof Error ? err.message : 'failed to load prompt'));
  }, []);

  const onSavePrompt = useCallback(async () => {
    setPromptMsg(null);
    try {
      await putPrompt(promptText);
      setPromptMsg('saved — applies to the next message');
      setPromptDirty(false);
    } catch (err) {
      setPromptMsg(err instanceof Error ? err.message : 'save failed');
    }
  }, [promptText]);

  const onResetPrompt = useCallback(async () => {
    setPromptMsg(null);
    try {
      const info = await resetPrompt();
      setPromptText(info.prompt);
      setPromptDefault(info.default);
      setPromptMsg('reset to built-in default');
      setPromptDirty(false);
    } catch (err) {
      setPromptMsg(err instanceof Error ? err.message : 'reset failed');
    }
  }, []);

  const statusLine = status
    ? [
        ['whisper', status.whisperOnline],
        ['chatterbox', status.chatterboxOnline],
        ['ollama', status.ollamaOnline],
      ]
        .map(([name, ok]) => `${name}: ${ok ? '✓' : '✗'}`)
        .join('  ·  ')
    : 'checking services…';

  return (
    <div className="chat">
      <header className="topbar">
        <h1>
          <span className="rune">ᚦ</span> OEchat
        </h1>
        <div className="topbar-actions">
          <span className="status" title={statusLine}>
            {statusLine}
          </span>
          <button type="button" className="ghost-btn" onClick={toggleMute}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button type="button" className="ghost-btn" title="Edit system prompt" onClick={openPromptEditor}>
            ⚙
          </button>
          <button type="button" className="ghost-btn" onClick={onClear} disabled={messages.length === 0}>
            clear
          </button>
        </div>
      </header>

      <main className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <p>
              <strong>Wes hāl!</strong> Speak Old English with Se Lēodwita, or type below.
            </p>
            <p className="hint">
              Try: <em>wes hal</em>, <em>hu eart thu?</em>, <em>my name is Ælfred</em>,{' '}
              <em>hwǣr is se meduseld?</em>
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} muted={muted} />
        ))}
        {busy && (
          <div className="bubble bot busy">
            <span className="dots">
              <span /> <span /> <span />
            </span>
          </div>
        )}
        {banner && <div className="banner">{banner}</div>}
        <div ref={endRef} />
      </main>

      <footer className="composer">
        <form onSubmit={onSubmit} className="composer-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="… or write Old English"
            disabled={busy}
            aria-label="Message"
          />
          <button type="submit" className="send-btn" disabled={busy || !input.trim()}>
            ➤
          </button>
        </form>
        <MicButton onBlob={(b) => void onMicBlob(b)} disabled={busy || !status?.whisperOnline} />
      </footer>

      {promptOpen && (
        <div className="modal-backdrop" onClick={() => setPromptOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>System prompt</h2>
            <p className="hint">
              This is what Se Lēodwita hears on every message. Edits apply from the next message on
              and survive restarts; reset restores the built-in default (with vocabulary).
            </p>
            <textarea
              className="prompt-editor"
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value);
                setPromptDirty(e.target.value !== promptDefault);
              }}
              spellCheck={false}
              aria-label="System prompt"
            />
            <div className="modal-actions">
              <span className="prompt-msg">{promptMsg}</span>
              <button
                type="button"
                className="ghost-btn"
                onClick={onResetPrompt}
                disabled={!promptDirty && promptText === promptDefault}
              >
                reset to default
              </button>
              <button type="button" className="send-btn" onClick={() => void onSavePrompt()}>
                save
              </button>
              <button type="button" className="ghost-btn" onClick={() => setPromptOpen(false)}>
                close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}