import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useSocket } from '../socket/SocketContext';
import type { ThreadMessage } from '../types';

/**
 * Loads history for one conversation over REST, then joins its socket room
 * for live updates. Only one room is joined at a time — switching
 * conversationId leaves the old room first, so a stray 'message' from a
 * previous thread can't leak into the new one.
 */
export function useChat(conversationId: string | null) {
  const socket = useSocket();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  // True between a patient message landing and the agent's reply landing —
  // drives the typing indicator. Keyed off message *sender*, not who's
  // viewing, so it works for the patient waiting on their own message and
  // for an admin watching Alex's thread live.
  const [awaitingReply, setAwaitingReply] = useState(false);
  // True while the synthesized reply audio is actually playing back.
  const [speaking, setSpeaking] = useState(false);
  // A reply's audio just arrived but hasn't been played yet — the caller
  // decides whether/when to call playPendingAudio() (a checkbox in the
  // hybrid text+mic view, or always in the dedicated Voice Mode screen).
  // Audio never plays itself just because it arrived.
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  // A server-side send failure (e.g. Deepgram came back with an empty
  // transcript). `id` increments on every error so consumers can react to
  // "a new one just happened" via a useEffect dependency, even if the
  // message text repeats. Without surfacing this, a caller tracking its
  // own "is something pending" bridge state (see VoiceMode/PatientApp)
  // has no way to know the send actually failed, and sits "loading"
  // until a timeout — there's no 'agent' message coming to tell it otherwise.
  const [lastError, setLastError] = useState<{ id: number; message: string } | null>(null);
  const errorIdRef = useRef(0);
  const joinedRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setAwaitingReply(false);
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    api
      .getMessages(conversationId)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const join = () => {
      socket.emit('join_conversation', { conversationId });
      joinedRef.current = conversationId;
    };
    join();

    // Socket.IO gives a reconnect (server restart, a dropped wifi blip) a
    // brand-new session — the server re-adds it to the admin/patient role
    // rooms automatically on connect, but nothing re-joins a specific
    // conversation room on its behalf. Without this, live updates for the
    // open thread silently stop after any reconnect until the user
    // switches chats or reloads. Re-fetching history too catches up on
    // anything sent while this client was disconnected.
    const onReconnect = () => {
      join();
      api.getMessages(conversationId).then(setMessages);
    };
    socket.on('connect', onReconnect);

    // Dedupe by id: StrictMode's double-invoked effects, a socket
    // reconnect, or the REST history fetch and a live 'message' event
    // landing close together can all otherwise deliver the same message twice.
    const onMessage = (message: ThreadMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      if (message.sender === 'patient') setAwaitingReply(true);
      else if (message.sender === 'agent') setAwaitingReply(false);
    };
    socket.on('message', onMessage);

    // Safety net: if the send itself fails server-side, no 'agent' message
    // will ever arrive to clear the indicator.
    const onError = (payload: { message?: string }) => {
      setAwaitingReply(false);
      errorIdRef.current += 1;
      setLastError({ id: errorIdRef.current, message: payload?.message ?? 'Something went wrong.' });
    };
    socket.on('error', onError);

    // Only the socket that sent the voice message receives this (see
    // chat.gateway.ts). Just stage it — the caller decides whether to play it.
    const onVoiceAudio = (payload: { audioBase64: string; mimetype: string }) => {
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
      const bytes = Uint8Array.from(atob(payload.audioBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: payload.mimetype }));
      pendingUrlRef.current = url;
      setPendingAudioUrl(url);
    };
    socket.on('voice_audio', onVoiceAudio);

    return () => {
      socket.off('message', onMessage);
      socket.off('error', onError);
      socket.off('voice_audio', onVoiceAudio);
      socket.off('connect', onReconnect);
      if (joinedRef.current) {
        socket.emit('leave_conversation', { conversationId: joinedRef.current });
        joinedRef.current = null;
      }
    };
  }, [socket, conversationId]);

  // Clean up the audio element and any un-played object URL when the
  // conversation changes or the component unmounts.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = null;
    };
  }, [conversationId]);

  const sendMessage = (body: string) => {
    if (!socket || !conversationId) return;
    socket.emit('send_message', { conversationId, body });
  };

  const sendVoiceAudio = (audioBase64: string, mimetype: string) => {
    if (!socket || !conversationId) return;
    socket.emit('send_voice_message', { conversationId, audio: audioBase64, mimetype });
  };

  /** Plays the most recently arrived reply audio, if any hasn't been played yet. */
  const playPendingAudio = () => {
    if (!pendingAudioUrl) return;
    const audio = new Audio(pendingAudioUrl);
    audioRef.current = audio;
    setSpeaking(true);
    setPendingAudioUrl(null);
    audio.onended = audio.onerror = () => setSpeaking(false);
    audio.play().catch(() => setSpeaking(false));
  };

  return {
    messages,
    sendMessage,
    sendVoiceAudio,
    loading,
    awaitingReply,
    speaking,
    pendingAudioUrl,
    playPendingAudio,
    lastError,
  };
}
