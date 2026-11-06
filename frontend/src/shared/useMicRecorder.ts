import { useRef, useState } from 'react';

const MIN_RECORDING_MS = 300;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is "data:<mime>;base64,<data>" — strip the prefix.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Push-to-talk mic capture: hold to record, release to get back one
 * complete utterance as base64 + its mimetype, ready to send to the
 * voice socket event. Deliberately not continuous/streaming — see
 * chat.gateway.ts for why push-to-talk was the safer choice here.
 */
export function useMicRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  // getUserMedia + MediaRecorder setup isn't instant — a quick tap can
  // release before start() has actually assigned recorderRef. Without
  // this, stop() would see recorderRef.current === null and silently
  // drop the whole press as if nothing happened (no recording, no
  // error, no feedback — just a confusing blink). Stashing the in-flight
  // promise lets stop() wait for start() to actually finish first.
  const startingRef = useRef<Promise<void> | null>(null);

  const start = () => {
    setError(null);
    const promise = (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start();
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setRecording(true);
      } catch {
        setError('Microphone access was denied or is unavailable.');
      }
    })();
    startingRef.current = promise;
    return promise;
  };

  /** Resolves with null if nothing usable was recorded (permission denied, or released too quickly to capture anything). */
  const stop = async (): Promise<{ base64: string; mimetype: string } | null> => {
    if (startingRef.current) {
      await startingRef.current;
      startingRef.current = null;
    }
    const recorder = recorderRef.current;
    if (!recorder) return null;

    const heldMs = Date.now() - startedAtRef.current;
    if (heldMs < MIN_RECORDING_MS) {
      // Let the recorder actually stop and release the mic, but don't
      // bother sending what's almost certainly silence or a click pop —
      // Deepgram would just come back with an empty transcript anyway,
      // after a full round trip the patient has to sit through for nothing.
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      setError('Hold the mic a little longer to record something.');
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const mimetype = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimetype });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        resolve({ base64: await blobToBase64(blob), mimetype });
      };
      recorder.stop();
    });
  };

  return { recording, error, start, stop };
}
