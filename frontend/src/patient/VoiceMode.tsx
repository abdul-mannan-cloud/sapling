import { useEffect, useState } from 'react';
import { useMicRecorder } from '../shared/useMicRecorder';
import { ChatThread } from '../shared/ChatThread';
import { SaplingMark } from '../components/Logo';
import { IconSquare, IconX } from '../components/Icons';
import type { ThreadMessage } from '../types';

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATE_LABEL: Record<OrbState, string> = {
  idle: 'Tap to talk',
  listening: 'Listening — tap to send',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

/**
 * A dedicated, voice-only screen — no text input, no quick actions. Tap
 * once to start talking, tap again to send; the reply always plays back
 * automatically here (unlike the hybrid text+mic composer, where that's
 * an explicit opt-in). The transcript still renders underneath, de-
 * emphasized, so a reviewer can inspect the conversation even though
 * nothing here is meant to be read mid-call.
 */
export function VoiceMode({
  messages,
  awaitingReply,
  speaking,
  pendingAudioUrl,
  playPendingAudio,
  sendVoiceAudio,
  lastError,
  onExit,
}: {
  messages: ThreadMessage[];
  awaitingReply: boolean;
  speaking: boolean;
  pendingAudioUrl: string | null;
  playPendingAudio: () => void;
  sendVoiceAudio: (base64: string, mimetype: string) => void;
  lastError: { id: number; message: string } | null;
  onExit: () => void;
}) {
  const { recording, error, start, stop } = useMicRecorder();
  // Bridges the gap "thinking" would otherwise miss: stop() finishing is
  // just the local recording wrapping up — the actual work (upload,
  // Deepgram transcription, the agent turn) all happens *after* that and
  // before `awaitingReply` ever turns true. Without this, the orb drops
  // back to idle for however long that round trip takes, then jumps
  // straight to "thinking" — looking like it stalled. `sending` now
  // covers the entire span from "stop tapped" to "a reply is landing",
  // cleared only once awaitingReply/speaking actually take over (or by
  // the safety timeout below, if something fails silently).
  const [sending, setSending] = useState(false);

  // This is the one place audio should always play itself — the whole
  // point of this screen is a hands-free, voice-only conversation.
  useEffect(() => {
    if (pendingAudioUrl) playPendingAudio();
  }, [pendingAudioUrl, playPendingAudio]);

  useEffect(() => {
    if (awaitingReply || speaking) setSending(false);
  }, [awaitingReply, speaking]);

  // A reported send failure (e.g. Deepgram got an empty transcript) also
  // means no 'agent' message is ever coming, so clear immediately rather
  // than waiting out the safety timeout below.
  useEffect(() => {
    if (lastError) setSending(false);
  }, [lastError]);

  // Last-resort safety net in case something fails silently with no
  // error event at all.
  useEffect(() => {
    if (!sending) return;
    const timeout = setTimeout(() => setSending(false), 20_000);
    return () => clearTimeout(timeout);
  }, [sending]);

  const state: OrbState = recording ? 'listening' : speaking ? 'speaking' : awaitingReply || sending ? 'thinking' : 'idle';
  const disabled = state === 'thinking' || state === 'speaking';

  const handleOrbClick = async () => {
    if (disabled) return;
    if (!recording) {
      await start();
      return;
    }
    // Flips the orb to "thinking" the instant stop is tapped, before any
    // of the async work below even starts.
    setSending(true);
    const result = await stop();
    if (!result) {
      setSending(false);
      return;
    }
    sendVoiceAudio(result.base64, result.mimetype);
  };

  return (
    <div className="voice-mode">
      <button className="voice-exit" onClick={onExit} aria-label="Exit voice mode">
        <IconX size={16} />
        Back to chat
      </button>

      <div className="voice-stage">
        <button className={`voice-orb state-${state}`} onClick={handleOrbClick} disabled={disabled} aria-label={STATE_LABEL[state]}>
          <span className="voice-orb-mark">
            {state === 'listening' ? <IconSquare size={22} /> : <SaplingMark size={34} />}
          </span>
          {(state === 'listening' || state === 'thinking') && <span className="voice-orb-ring" aria-hidden="true" />}
        </button>
        <div className="voice-state-label">{STATE_LABEL[state]}</div>
        {(error ?? lastError?.message) && <div className="voice-error">{error ?? lastError?.message}</div>}
      </div>

      <div className="voice-transcript">
        <div className="voice-transcript-label">Transcript</div>
        <ChatThread messages={messages} emptyHint="Tap the circle above and say something to the clinic." />
      </div>
    </div>
  );
}
