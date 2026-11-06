import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { ClockBar } from '../components/ClockBar';
import { PatientListView } from './PatientListView';
import { PatientDetailView } from './PatientDetailView';
import { AllHandoffsView } from './AllHandoffsView';
import { AllChatsView } from './AllChatsView';
import type { PatientSummary } from '../types';

type Tab = 'patients' | 'handoffs' | 'chats';

export function AdminApp() {
  const { auth, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('patients');
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [clock, setClock] = useState<{ now: string; description: string } | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.listPatients().then(setPatients);
    api.getClock().then(setClock);
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
  };

  return (
    <div className="app admin-app">
      <div className="topbar">
        <div className="brand">
          <h1>Sapling Family Clinic — Admin</h1>
          <small>Signed in as {auth!.username} (staff)</small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {clock && <ClockBar now={clock.now} description={clock.description} onSet={handleSetClock} />}
          <button className="small" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'patients' ? 'active' : ''} onClick={() => switchTab('patients')}>
          Patients
        </button>
        <button className={tab === 'handoffs' ? 'active' : ''} onClick={() => switchTab('handoffs')}>
          All Handoffs
        </button>
        <button className={tab === 'chats' ? 'active' : ''} onClick={() => switchTab('chats')}>
          All Chats
        </button>
      </div>

      {selectedPatientId ? (
        <PatientDetailView
          patientId={selectedPatientId}
          initialConversationId={selectedConversationId}
          onBack={() => setSelectedPatientId(null)}
        />
      ) : tab === 'patients' ? (
        <PatientListView patients={patients} onSelect={openPatient} />
      ) : tab === 'handoffs' ? (
        <AllHandoffsView onOpenPatient={openPatient} />
      ) : (
        <AllChatsView onOpen={openPatient} />
      )}
    </div>
  );
}
