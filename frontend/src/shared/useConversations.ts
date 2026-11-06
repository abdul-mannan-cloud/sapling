import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSocket } from '../socket/SocketContext';
import type { ConversationSummary, ThreadMessage } from '../types';

/** `patientId` omitted lists every patient's conversations (the admin "All Chats" tab). */
export function useConversations(patientId?: string) {
  const socket = useSocket();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  // Returns the fetched list too, so a caller that needs the fresh data
  // right away (e.g. picking a new active chat after deleting one) doesn't
  // have to issue a second, redundant listConversations call.
  const refresh = () => api.listConversations(patientId).then((list) => (setConversations(list), list));

  useEffect(() => {
    refresh();
  }, [patientId]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (update: { id: string; patientId: string; updatedAt: string; lastMessage: ThreadMessage }) => {
      if (patientId && update.patientId !== patientId) return;
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === update.id);
        const next = existing
          ? { ...existing, updatedAt: update.updatedAt, lastMessage: update.lastMessage }
          : { id: update.id, patientId: update.patientId, title: null, createdAt: update.updatedAt, updatedAt: update.updatedAt, lastMessage: update.lastMessage };
        const rest = prev.filter((c) => c.id !== update.id);
        return [next, ...rest];
      });
    };
    socket.on('conversation_updated', onUpdate);
    // Catch up on anything missed while disconnected (server restart, a
    // dropped connection) — the server re-adds a reconnecting socket to
    // its role room automatically, but any updates that happened in the
    // gap were never seen, so a plain re-fetch on every (re)connect fixes it.
    socket.on('connect', refresh);
    return () => {
      socket.off('conversation_updated', onUpdate);
      socket.off('connect', refresh);
    };
  }, [socket, patientId]);

  return { conversations, refresh };
}
