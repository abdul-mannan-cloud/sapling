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

export const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

let authToken: string | null = null;

/** Called by AuthContext whenever login/logout happens so every api.* call below is authenticated without threading the token through every call site. */
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
};
