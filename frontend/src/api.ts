import type {
  AuthState,
  ConversationSummary,
  HandoffRecord,
  HandoffStatus,
  OpenSlot,
  PatientRecord,
  PatientSummary,
  Role,
  ThreadMessage,
} from './types';
import { AUTH_STORAGE_KEY } from './auth/storageKey';

export const BASE = (import.meta.env.VITE_API_BASE ?? 'http://localhost:3001').trim().replace(/\/+$/, '');

function readStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw).token ?? null) : null;
  } catch {
    return null;
  }
}

// Seeded synchronously at module load — before React (or any component
// effect) ever runs — rather than waiting for AuthProvider's effect to call
// setAuthToken(). Effects fire child-first, so on first mount a child
// component's own data-fetching effect (e.g. PatientApp loading the
// patient record) can run before AuthProvider's effect has had a chance
// to sync the token, sending that first round of requests out with no
// Authorization header at all. Reading localStorage directly here closes
// that window entirely.
let authToken: string | null = readStoredToken();

/** Called by AuthContext on login/logout to keep this in sync after the initial load. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  myRequests: () => request<HandoffRecord[]>('/my-requests'),
  editMyRequest: (id: string, details: Record<string, string>) => request<HandoffRecord>(`/my-requests/${id}`, { method: 'PATCH', body: JSON.stringify(details) }),
  cancelMyRequest: (id: string) => request<HandoffRecord>(`/my-requests/${id}`, { method: 'DELETE' }),
  login: (username: string, password: string) =>
    request<{ token: string; role: Role; username: string; patientId?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }).then((r): AuthState => r),

  getFaq: () => request<{ text: string }>('/faq'),
  getOpenSlots: () => request<OpenSlot[]>('/open-slots'),

  getClock: () => request<{ now: string; description: string }>('/clock'),
  setClock: (now: string) =>
    request<{ now: string; description: string }>('/clock', { method: 'PUT', body: JSON.stringify({ now }) }),

  listPatients: () => request<PatientSummary[]>('/patients'),
  getPatient: (id: string) => request<PatientRecord>(`/patients/${id}`),

  listConversations: (patientId?: string) =>
    request<ConversationSummary[]>(`/conversations${patientId ? `?patientId=${patientId}` : ''}`),
  createConversation: (patientId?: string, title?: string) =>
    request<{ id: string }>('/conversations', { method: 'POST', body: JSON.stringify({ patientId, title }) }),
  getMessages: (conversationId: string) => request<ThreadMessage[]>(`/conversations/${conversationId}/messages`),
  renameConversation: (conversationId: string, title: string) =>
    request<{ id: string; title: string }>(`/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  deleteConversation: (conversationId: string) =>
    request<{ ok: true }>(`/conversations/${conversationId}`, { method: 'DELETE' }),

  listHandoffs: () => request<HandoffRecord[]>('/handoffs'),
  setHandoffStatus: (id: string, status: HandoffStatus) =>
    request<HandoffRecord>(`/handoffs/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getOfflineMode: () => request<{ forced: boolean; llmConfigured: boolean }>('/agent-mode'),
  setOfflineMode: (forced: boolean) =>
    request<{ forced: boolean; llmConfigured: boolean }>('/agent-mode', { method: 'PUT', body: JSON.stringify({ forced }) }),
};
