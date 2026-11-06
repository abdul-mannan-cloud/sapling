import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useConversations } from '../shared/useConversations';
import { useChat } from '../shared/useChat';
import { ChatThread } from '../shared/ChatThread';
import { Composer } from '../shared/Composer';
import { ChatSidebar } from './ChatSidebar';
import { QuickActions } from './QuickActions';
import { VoiceMode } from './VoiceMode';
import { PatientPanel } from '../components/PatientPanel';
import { Logo } from '../components/Logo';
import { MicButton } from '../components/MicButton';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { IconClock, IconLogout, IconMic } from '../components/Icons';
import type { OpenSlot, PatientRecord } from '../types';

export function PatientApp() {
  const { auth, logout } = useAuth();
  const patientId = auth!.patientId!;

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [faq, setFaq] = useState('');
  const [openSlots, setOpenSlots] = useState<OpenSlot[]>([]);
  const [clockDescription, setClockDescription] = useState('');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  // Off by default — a reply's audio only plays automatically here if the
  // patient opts in. Voice Mode (below) is the exception: it's voice-only
  // by definition, so it always plays regardless of this setting.
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);

  const { conversations, refresh } = useConversations(patientId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { messages, sendMessage, sendVoiceAudio, awaitingReply, speaking, pendingAudioUrl, playPendingAudio, lastError } =
    useChat(activeId);
  // Same bridging gap as VoiceMode: MicButton reports this the instant the
  // mic is released, well before awaitingReply can turn true on its own
  // (that only happens once the server has transcribed and echoed the
  // message back) — without it, the typing indicator would drop out for
  // however long that round trip takes.
  const [micPending, setMicPending] = useState(false);

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

  // The opt-in path: only plays if the checkbox is checked. Voice Mode
  // handles its own always-on playback separately, so this only applies
  // while in the text+mic hybrid view.
  useEffect(() => {
    if (mode === 'text' && autoPlayAudio && pendingAudioUrl) playPendingAudio();
  }, [mode, autoPlayAudio, pendingAudioUrl, playPendingAudio]);

  // Clear the bridge once the real thing takes over, on a reported send
  // failure (e.g. Deepgram got nothing usable from a too-short clip), or
  // after a safety timeout if something failed silently server-side.
  useEffect(() => {
    if (awaitingReply) setMicPending(false);
  }, [awaitingReply]);
  useEffect(() => {
    if (lastError) setMicPending(false);
  }, [lastError]);
  useEffect(() => {
    if (!micPending) return;
    const timeout = setTimeout(() => setMicPending(false), 20_000);
    return () => clearTimeout(timeout);
  }, [micPending]);

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
    const remaining = await refresh();
    if (activeId === id) setActiveId(remaining[0]?.id ?? null);
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-side">
          <Logo size={20} sub="Family Clinic" />
        </div>
        <div className="topbar-side">
          {clockDescription && (
            <span className="chip">
              <IconClock size={12} />
              {clockDescription}
            </span>
          )}
          <button className="icon-btn" onClick={logout} aria-label="Log out" title={`Log out (${auth!.username})`}>
            <IconLogout size={16} />
          </button>
        </div>
      </header>

      <div className="patient-shell">
        <ChatSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={handleNew}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        {mode === 'voice' && activeId ? (
          <VoiceMode
            messages={messages}
            awaitingReply={awaitingReply}
            speaking={speaking}
            pendingAudioUrl={pendingAudioUrl}
            playPendingAudio={playPendingAudio}
            sendVoiceAudio={sendVoiceAudio}
            lastError={lastError}
            onExit={() => setMode('text')}
          />
        ) : (
          <div className="chat-column">
            <div className="chat-header">
              <span className="chat-header-title">{activeConversation?.title ?? (activeId ? 'New conversation' : 'No chat selected')}</span>
              <span className="chat-header-sub">with Sapling Family Clinic</span>
              <button className="btn ghost small voice-mode-toggle" disabled={!activeId} onClick={() => setMode('voice')}>
                <IconMic size={13} />
                Voice mode
              </button>
            </div>
            <ChatThread messages={messages} emptyHint="Send a message to start this conversation." typing={awaitingReply || micPending} />
            <QuickActions openSlots={openSlots} onSend={sendMessage} disabled={!activeId || awaitingReply || micPending} />
            <Composer
              placeholder={awaitingReply || micPending ? 'Waiting for the agent to reply…' : 'Type, or hold the mic to talk…'}
              disabled={!activeId || awaitingReply || micPending}
              onSend={sendMessage}
              extra={
                <MicButton
                  disabled={!activeId || awaitingReply || micPending}
                  speaking={speaking}
                  onSendingChange={setMicPending}
                  onRecorded={(base64, mimetype) => sendVoiceAudio(base64, mimetype)}
                  serverError={lastError?.message}
                />
              }
              hintExtra={<ToggleSwitch checked={autoPlayAudio} onChange={setAutoPlayAudio} label="Play audio on reply" />}
            />
          </div>
        )}

        <PatientPanel patient={patient} faq={faq} openSlots={openSlots} />
      </div>
    </div>
  );
}
