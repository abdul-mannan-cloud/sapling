import { useMicRecorder } from '../shared/useMicRecorder';
import { IconMic, IconSquare } from './Icons';

/**
 * Hold-to-talk voice input. Mirrors the Composer's role (an alternate way
 * to produce the same patient/clinic message) rather than being a
 * separate "voice mode" — released audio goes through the exact same
 * agent pipeline as typed text, so the chat thread shows one unified
 * transcript regardless of which input method produced each line.
 */
export function MicButton({
  onRecorded,
  onSendingChange,
  disabled,
  speaking,
  serverError,
}: {
  onRecorded: (base64: string, mimetype: string) => void;
  /**
   * Fires `true` the instant the mic is released, before transcription or
   * the agent turn even starts — the caller should treat this exactly
   * like "a reply is pending" (e.g. OR it into a typing indicator) until
   * its own `awaitingReply` takes over, since there's a real gap between
   * "recording stopped" and "the server has even seen it yet".
   */
  onSendingChange?: (sending: boolean) => void;
  disabled?: boolean;
  speaking?: boolean;
  /** A send failure reported by the server (e.g. Deepgram got an empty transcript) — shown the same way as a local mic error. */
  serverError?: string | null;
}) {
  const { recording, error, start, stop } = useMicRecorder();
  const shownError = error ?? serverError;

  const handleStop = async () => {
    onSendingChange?.(true);
    const result = await stop();
    if (result) {
      onRecorded(result.base64, result.mimetype);
    } else {
      onSendingChange?.(false);
    }
  };

  return (
    <div className="mic-control">
      <button
        type="button"
        className={`mic-btn${recording ? ' recording' : ''}${speaking ? ' speaking' : ''}`}
        disabled={disabled && !recording}
        title={speaking ? 'Playing the reply…' : 'Hold to talk'}
        onMouseDown={start}
        onMouseUp={handleStop}
        onMouseLeave={() => recording && handleStop()}
        onTouchStart={(e) => {
          e.preventDefault();
          start();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleStop();
        }}
      >
        {recording ? <IconSquare size={14} /> : <IconMic size={16} />}
        {recording && <span className="mic-pulse-ring" aria-hidden="true" />}
      </button>
      {shownError && <span className="mic-error">{shownError}</span>}
    </div>
  );
}
