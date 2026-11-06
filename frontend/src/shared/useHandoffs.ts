import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSocket } from '../socket/SocketContext';
import type { HandoffRecord } from '../types';

/** Admin-only: the live staff queue. The backend only ever pushes 'handoff' events into the admin room, so a patient's socket never receives these. */
export function useHandoffs() {
  const socket = useSocket();
  const [handoffs, setHandoffs] = useState<HandoffRecord[]>([]);

  const refresh = () => api.listHandoffs().then(setHandoffs);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onHandoff = (handoff: HandoffRecord) => {
      setHandoffs((prev) => {
        const rest = prev.filter((h) => h.id !== handoff.id);
        return [handoff, ...rest];
      });
    };
    socket.on('handoff', onHandoff);
    return () => {
      socket.off('handoff', onHandoff);
    };
  }, [socket]);

  const setStatus = async (id: string, status: HandoffRecord['status']) => {
    const updated = await api.setHandoffStatus(id, status);
    setHandoffs((prev) => prev.map((h) => (h.id === id ? updated : h)));
  };

  return { handoffs, setStatus };
}
