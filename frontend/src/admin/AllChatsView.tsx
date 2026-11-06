import { useEffect, useState } from 'react';
import { api } from '../api';
import { useConversations } from '../shared/useConversations';
import type { PatientSummary } from '../types';

const SENDER_LABEL: Record<string, string> = {
  clinic: 'Staff',
  patient: 'Patient',
  agent: 'Agent',
};

export function AllChatsView({ onOpen }: { onOpen: (patientId: string, conversationId: string) => void }) {
  const { conversations } = useConversations();
  const [patients, setPatients] = useState<Record<string, PatientSummary>>({});

  useEffect(() => {
    api.listPatients().then((list) => {
      setPatients(Object.fromEntries(list.map((p) => [p.patient_id, p])));
    });
  }, []);

  return (
    <div className="admin-main">
      <h2 className="section-title">All chats</h2>
      <p className="section-sub">Every thread across every patient, newest activity first.</p>
      {conversations.length === 0 && <div className="empty-state">No conversations yet.</div>}
      <div className="chat-list-table">
        {conversations.map((c) => (
          <div key={c.id} className="chat-list-row" onClick={() => onOpen(c.patientId, c.id)}>
            <div className="chat-list-row-patient">{patients[c.patientId]?.name ?? c.patientId}</div>
            <div className="chat-list-row-title">{c.title ?? 'Untitled chat'}</div>
            <div className="chat-list-row-preview">
              {c.lastMessage && <span className="sender-chip">{SENDER_LABEL[c.lastMessage.sender] ?? c.lastMessage.sender}</span>}
              {c.lastMessage ? c.lastMessage.body : 'No messages yet'}
            </div>
            <div className="chat-list-row-time">{new Date(c.updatedAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
