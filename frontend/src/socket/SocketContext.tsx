import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { BASE } from '../api';
import { useAuth } from '../auth/AuthContext';

const SocketContext = createContext<Socket | null>(null);

/** One socket per login session, recreated whenever the token changes (login/logout). All chat send/receive goes through this — see backend/src/chat/chat.gateway.ts. */
export function SocketProvider({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!auth) {
      setSocket(null);
      return;
    }
    const s = io(BASE, { auth: { token: auth.token } });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [auth?.token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
