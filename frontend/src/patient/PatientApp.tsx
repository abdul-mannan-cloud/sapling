import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useConversations } from '../shared/useConversations';
import { useChat } from '../shared/useChat';
import { ChatThread } from '../shared/ChatThread';
import { Composer } from '../shared/Composer';
import { ChatSidebar } from './ChatSidebar';
import { PatientPanel } from '../components/PatientPanel';
import type { OpenSlot, PatientRecord } from '../types';

export function PatientApp() {
  const { auth, logout } = useAuth();
  const patientId = auth!.patientId!;

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [faq, setFaq] = useState('');
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [clockDescription, setClockDescription] = useState('');

  const { conversations, refresh } = useConversations(patientId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { messages, sendMessage } = useChat(activeId);

  useEffect(() => {
    api.getPatient(patientId).then(setPatient);
    api.getFaq().then((r) => setFaq(r.text));
    api.getOpenSlots().then(setOpenSlots);
    api.getClock().then((c) => setClockDescription(c.description));
  }, [patientId]);

  useEffect(() => {
    if (activeId === null && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const handleNew = async () => {
    const created = await api.createConversation();
    await refresh();
    setActiveId(created.id);
  };

  const handleRename = async (id: string, title: string) => {
    await api.renameConversation(id, title);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await api.deleteConversation(id);
    const remaining = await api.listConversations(patientId);
    if (activeId === id) setActiveId(remaining[0]?.id ?? null);
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <h1>Sapling Family Clinic</h1>
          <small>Signed in as {auth!.username} (patient) · {clockDescription}</small>
        </div>
        <button className="small" onClick={logout}>
          Log out
        </button>
      </div>

      <div className="patient-shell">
        <ChatSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={handleNew}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        <div className="chat-column">
          <div className="chat-header">{activeConversation?.title ?? (activeId ? 'New conversation' : 'No chat selected')}</div>
          <ChatThread messages={messages} emptyHint="Send a message to start this conversation." />
          <Composer placeholder="Type your message to the clinic…" disabled={!activeId} onSend={sendMessage} />
        </div>

        <PatientPanel patient={patient} faq={faq} openSlots={openSlots} />
      </div>
    </div>
  );
}
