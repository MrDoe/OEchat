import { useEffect } from 'react';
import { ChatPage } from './pages/ChatPage';
import { unlockAudio } from './audio';

export default function App() {
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return <ChatPage />;
}