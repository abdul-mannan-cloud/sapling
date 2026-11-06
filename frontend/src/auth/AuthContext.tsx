import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAuthToken } from '../api';
import { AUTH_STORAGE_KEY as STORAGE_KEY } from './storageKey';
import type { AuthState } from '../types';

interface AuthContextValue {
  auth: AuthState | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAuthToken(auth?.token ?? null);
  }, [auth]);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const result = await api.login(username, password);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      setAuth(result);
    } catch {
      setError('Invalid username or password');
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }, []);

  return <AuthContext.Provider value={{ auth, login, logout, error }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
