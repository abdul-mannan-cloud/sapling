import type { PatientRecord } from '../patient/patient.service.js';
import type { OpenSlot } from '../faq/faq.service.js';
import type { HandoffRecord, HandoffType } from '../handoffs/handoff.types.js';

export interface ThreadMessage {
  id: string;
  sender: 'clinic' | 'patient' | 'agent';
  body: string;
  createdAt: string;
  /**
   * Set (live-broadcast only, not persisted) when this agent reply
   * couldn't be matched to anything specific and fell back to a generic
   * `other` handoff — a keyword matcher especially will hit this often
   * on phrasing it doesn't recognize. The frontend uses it to show the
   * same quick-action buttons as the composer right under this message,
   * so "I don't know what you meant" comes with a way forward instead of
   * being a dead end. Not persisted: reopening the conversation later
   * won't re-show the buttons under old messages.
   */
  suggestActions?: boolean;
}

export interface AgentContext {
  conversationId?: string;
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
  /** Which channel this turn came in on — only affects the exact emergency wording ("text line" vs "voice service"). Defaults to 'text'. */
  channel?: 'text' | 'voice';
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
