// Playback of the synthesized Old English replies.
let current: HTMLAudioElement | null = null;
let unlocked = false;

export function stopAudio(): void {
  current?.pause();
  current = null;
}

// Browsers require a user gesture before audio can play; the first
// pointerdown/keypress unlocks the AudioContext (sticky user activation).
export function unlockAudio(): void {
  if (unlocked) return;
  unlocked = true;
  try {
    new AudioContext().resume();
  } catch {
    // AudioContext unavailable — Audio elements will still work after a click
  }
}

export function playBlob(blob: Blob): Promise<void> {
  stopAudio();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  current = audio;
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
  audio.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
  return audio.play();
}