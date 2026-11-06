import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSocket } from '../socket/SocketContext';
import type { ConversationSummary, ThreadMessage } from '../types';

/** `patientId` omitted lists every patient's conversations (the admin "All Chats" tab). */
export function useConversations(patientId?: string) {
  const socket = useSocket();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const refresh = () => api.listConversations(patientId).then(setConversations);

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
    return () => {
      socket.off('conversation_updated', onUpdate);
    };
  }, [socket, patientId]);

  return { conversations, refresh };
}
