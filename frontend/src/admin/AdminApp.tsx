import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { ClockBar } from '../components/ClockBar';
import { Logo } from '../components/Logo';
import { IconChat, IconInbox, IconLogout, IconUsers } from '../components/Icons';
import { useHandoffs } from '../shared/useHandoffs';
import { PatientListView } from './PatientListView';
import { PatientDetailView } from './PatientDetailView';
import { AllHandoffsView } from './AllHandoffsView';
import { AllChatsView } from './AllChatsView';
import type { PatientSummary } from '../types';

type Tab = 'patients' | 'handoffs' | 'chats';

const TAB_TITLE: Record<Tab, string> = {
  patients: 'Patients',
  handoffs: 'Staff queue',
  chats: 'All chats',
};

const TABS: Tab[] = ['patients', 'handoffs', 'chats'];

/** Reads the active tab from the URL hash so a reload (or a bookmark/shared link) lands back on the same tab instead of always resetting to Patients. */
function tabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '');
  return (TABS as string[]).includes(hash) ? (hash as Tab) : 'patients';
}

export function AdminApp() {
  const { auth, logout } = useAuth();
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [clock, setClock] = useState<{ now: string; description: string } | null>(null);
  const { handoffs } = useHandoffs();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);

  const pendingCount = handoffs.filter((h) => h.status === 'pending_staff').length;

  useEffect(() => {
    api.listPatients().then(setPatients);
    api.getClock().then(setClock);
  }, []);

  // Keeps the tab in sync with browser back/forward, not just reload.
  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openPatient = (patientId: string, conversationId?: string) => {
    setSelectedPatientId(patientId);
    setSelectedConversationId(conversationId);
  };

  const handleSetClock = async (iso: string) => {
    setClock(await api.setClock(iso));
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setSelectedPatientId(null);
    window.location.hash = next;
  };

  return (
    <div className="admin-shell">
      <aside className="side-nav">
        <div className="side-nav-brand">
          <Logo theme="dark" size={22} sub="Staff console" />
        </div>
        <nav>
          <button className={`nav-item${tab === 'patients' && !selectedPatientId ? ' active' : ''}`} onClick={() => switchTab('patients')}>
            <IconUsers size={17} />
            Patients
          </button>
          <button className={`nav-item${tab === 'handoffs' ? ' active' : ''}`} onClick={() => switchTab('handoffs')}>
            <IconInbox size={17} />
            Staff queue
            {pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
          </button>
          <button className={`nav-item${tab === 'chats' ? ' active' : ''}`} onClick={() => switchTab('chats')}>
            <IconChat size={17} />
            All chats
          </button>
        </nav>
        <div className="side-nav-footer">
          <div className="avatar">{auth!.username.slice(0, 2).toUpperCase()}</div>
          <div className="side-nav-user">
            <div className="name">{auth!.username}</div>
            <div className="role">Staff</div>
          </div>
          <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
            <IconLogout size={16} />
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <h1>{selectedPatientId ? 'Patient conversation' : TAB_TITLE[tab]}</h1>
          {clock && <ClockBar now={clock.now} description={clock.description} onSet={handleSetClock} />}
        </header>

        {selectedPatientId ? (
          <PatientDetailView
            patientId={selectedPatientId}
            initialConversationId={selectedConversationId}
            onBack={() => setSelectedPatientId(null)}
          />
        ) : tab === 'patients' ? (
          <PatientListView patients={patients} handoffs={handoffs} onSelect={openPatient} />
        ) : tab === 'handoffs' ? (
          <AllHandoffsView onOpenPatient={openPatient} />
        ) : (
          <AllChatsView onOpen={openPatient} />
        )}
      </div>
    </div>
  );
}
