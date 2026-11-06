import type { PatientRecord } from '../patient/patient.service.js';
import type { OpenSlot } from '../faq/faq.service.js';
import type { HandoffRecord, HandoffType } from '../handoffs/handoff.types.js';

export interface ThreadMessage {
  id: string;
  sender: 'clinic' | 'patient' | 'agent';
  body: string;
  createdAt: string;
}

export interface AgentContext {
  nowIso: string;
  nowDescription: string;
  patient: PatientRecord;
  faqText: string;
  openSlots: OpenSlot[];
  /** Full thread, oldest first, including the current inbound message. */
  history: ThreadMessage[];
  /** All of this patient's existing handoff records, any status. */
  handoffs: HandoffRecord[];
  currentMessage: ThreadMessage;
}

export interface HandoffAction {
  operation: 'create' | 'update';
  /** Required when operation is 'update'; must be an id from context.handoffs. */
  handoffId?: string;
  type: HandoffType;
  details: Record<string, unknown>;
}

export interface AgentResult {
  reply: string;
  handoffAction?: HandoffAction;
  /** Which path produced this result, surfaced in the UI/logs for transparency. */
  mode: 'rule' | 'llm' | 'emergency';
}
