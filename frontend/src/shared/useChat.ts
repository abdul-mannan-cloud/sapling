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
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
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

    socket.emit('join_conversation', { conversationId });
    joinedRef.current = conversationId;

    const onMessage = (message: ThreadMessage) => setMessages((prev) => [...prev, message]);
    socket.on('message', onMessage);

    return () => {
      socket.off('message', onMessage);
      if (joinedRef.current) {
        socket.emit('leave_conversation', { conversationId: joinedRef.current });
        joinedRef.current = null;
      }
    };
  }, [socket, conversationId]);

  const sendMessage = (body: string) => {
    if (!socket || !conversationId) return;
    socket.emit('send_message', { conversationId, body });
  };

  return { messages, sendMessage, loading };
}
