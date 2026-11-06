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
