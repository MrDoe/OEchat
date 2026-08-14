// Push-to-talk microphone recording via MediaRecorder (webm/opus).
let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

export function isRecording(): boolean {
  return recorder !== null && recorder.state === 'recording';
}

export async function startRecording(): Promise<void> {
  if (isRecording()) return;
  stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  chunks = [];
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';
  recorder = new MediaRecorder(stream, { mimeType: mime });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(250);
}

export function stopRecording(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state === 'inactive') {
      reject(new Error('not recording'));
      return;
    }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder?.mimeType ?? 'audio/webm' });
      chunks = [];
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      recorder = null;
      resolve(blob);
    };
    recorder.stop();
  });
}

export function cancelRecording(): void {
  if (!recorder || recorder.state === 'inactive') return;
  recorder.onstop = null;
  try {
    recorder.stop();
  } catch {
    // already stopped
  }
  chunks = [];
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  recorder = null;
}