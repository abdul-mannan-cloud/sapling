import { useEffect, useState } from 'react';
import { api } from '../api';
import { useConversations } from '../shared/useConversations';
import { useChat } from '../shared/useChat';
import { ChatThread } from '../shared/ChatThread';
import { Composer } from '../shared/Composer';
import { PatientPanel } from '../components/PatientPanel';
import type { OpenSlot, PatientRecord } from '../types';

export function PatientDetailView({
  patientId,
  initialConversationId,
  onBack,
}: {
  patientId: string;
  initialConversationId?: string;
  onBack: () => void;
}) {
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [faq, setFaq] = useState('');
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);

  const { conversations, refresh } = useConversations(patientId);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);
  const { messages, sendMessage } = useChat(activeId);

  useEffect(() => {
    api.getPatient(patientId).then(setPatient);
    api.getFaq().then((r) => setFaq(r.text));
    api.getOpenSlots().then(setOpenSlots);
  }, [patientId]);

  useEffect(() => {
    if (activeId === null && conversations.length > 0) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const handleNew = async () => {
    const created = await api.createConversation(patientId);
    await refresh();
    setActiveId(created.id);
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  return (
    <div className="admin-main patient-detail">
      <div className="patient-detail-header">
        <button className="small" onClick={onBack}>
          ← Back to patients
        </button>
        <h2 className="section-title">{patient?.name ?? patientId}</h2>
      </div>

      <div className="patient-detail-body">
        <div className="chat-column">
          <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`conversation-item${c.id === activeId ? ' active' : ''}`}
                style={{ minWidth: 160 }}
                onClick={() => setActiveId(c.id)}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>{c.title ?? new Date(c.createdAt).toLocaleString()}</span>
                <span className="preview">{c.lastMessage ? c.lastMessage.body : 'No messages yet'}</span>
              </div>
            ))}
            <button className="small" onClick={handleNew}>
              + New conversation
            </button>
          </div>

          <div className="chat-header">{activeConversation?.title ?? (activeId ? 'Untitled chat' : 'No chat selected')}</div>

          <ChatThread
            messages={messages}
            emptyHint="No messages yet. Start this thread with an outbound message to the patient."
          />
          <Composer placeholder="Message this patient as clinic staff…" disabled={!activeId} onSend={sendMessage} />
        </div>

        <PatientPanel patient={patient} faq={faq} openSlots={openSlots} />
      </div>
    </div>
  );
}
