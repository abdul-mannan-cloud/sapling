import { useEffect, useState } from 'react';
import { api } from '../api';
import { useConversations } from '../shared/useConversations';
import { useChat } from '../shared/useChat';
import { ChatThread } from '../shared/ChatThread';
import { Composer } from '../shared/Composer';
import { PatientPanel } from '../components/PatientPanel';
import { IconBack, IconPlus } from '../components/Icons';
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
  const { messages, sendMessage, awaitingReply } = useChat(activeId);

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
        <button className="btn ghost small" onClick={onBack}>
          <IconBack size={14} />
          Patients
        </button>
        <h2 className="section-title">{patient?.name ?? patientId}</h2>
      </div>

      <div className="patient-detail-body">
        <div className="chat-column">
          <div className="thread-tabs">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`conversation-item${c.id === activeId ? ' active' : ''}`}
                onClick={() => setActiveId(c.id)}
              >
                <span className="tab-title">{c.title ?? new Date(c.createdAt).toLocaleDateString()}</span>
                <span className="preview">{c.lastMessage ? c.lastMessage.body : 'No messages yet'}</span>
              </div>
            ))}
            <button className="btn ghost small" style={{ alignSelf: 'center', margin: '0 4px' }} onClick={handleNew}>
              <IconPlus size={14} />
              New thread
            </button>
          </div>

          <div className="chat-header">
            <span className="chat-header-title">{activeConversation?.title ?? (activeId ? 'Untitled chat' : 'No chat selected')}</span>
            <span className="chat-header-sub">outbound threads read by the patient in their app</span>
          </div>

          <ChatThread
            messages={messages}
            emptyHint="No messages yet. Start this thread with an outbound message to the patient."
            typing={awaitingReply}
          />
          <Composer placeholder="Message this patient as clinic staff…" disabled={!activeId} onSend={sendMessage} />
        </div>

        <PatientPanel patient={patient} faq={faq} openSlots={openSlots} />
      </div>
    </div>
  );
}
