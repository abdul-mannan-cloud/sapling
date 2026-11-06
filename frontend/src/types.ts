export interface PatientRecord {
  patient_id: string;
  name: string;
  preferred_name: string;
  date_of_birth: string;
  language: string;
  phone: string;
  conditions: string[];
  medications: { name: string; dose: string; frequency: string; refills_remaining: number }[];
  pharmacy: string;
  insurance: { payer: string; plan: string };
  last_visit: { date: string; provider: string; reason: string; plan_note: string };
  upcoming_appointments: { date: string; time: string; provider: string; type: string; status: string }[];
  balance: { amount: number; reason: string };
}

export interface PatientSummary {
  patient_id: string;
  name: string;
  preferred_name: string;
}

export interface ThreadMessage {
  id: string;
  sender: 'clinic' | 'patient' | 'agent';
  body: string;
  createdAt: string;
  /** Live-broadcast only (never present on messages loaded from history) — the agent couldn't match this one to anything specific, so show the same quick-action buttons as the composer right under it. */
  suggestActions?: boolean;
}

export type HandoffType = 'appointment_request' | 'refill' | 'clinical_question' | 'billing' | 'other' | 'emergency';
export type HandoffStatus = 'pending_staff' | 'resolved' | 'cancelled';

export interface HandoffRecord {
  id: string;
  patientId: string;
  conversationId: string;
  type: HandoffType;
  status: HandoffStatus;
  details: Record<string, unknown>;
  messageIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  patientId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessage: ThreadMessage | null;
}

export interface OpenSlot {
  date: string;
  start: string;
  provider: string;
}

export type Role = 'admin' | 'patient';

export interface AuthState {
  token: string;
  role: Role;
  username: string;
  patientId?: string;
}
