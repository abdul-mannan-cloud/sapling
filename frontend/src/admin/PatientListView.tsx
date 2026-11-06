import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ConversationSummary, HandoffRecord, PatientSummary } from '../types';
import { IconChevronRight } from '../components/Icons';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function shortTime(iso: string) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * The console's front page: a stat strip over a patient roster. Rows carry
 * the numbers staff actually triage by — pending requests and recent
 * activity — fed live by the handoff socket pushes AdminApp already
 * subscribes to, so a new request from any patient re-badges their row
 * without a refresh.
 */
export function PatientListView({
  patients,
  handoffs,
  onSelect,
}: {
  patients: PatientSummary[];
  handoffs: HandoffRecord[];
  onSelect: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    api.listConversations().then(setConversations);
  }, []);

  const pendingByPatient = new Map<string, number>();
  for (const h of handoffs) {
    if (h.status === 'pending_staff') {
      pendingByPatient.set(h.patientId, (pendingByPatient.get(h.patientId) ?? 0) + 1);
    }
  }

  const lastActivityByPatient = new Map<string, string>();
  const chatsByPatient = new Map<string, number>();
  for (const c of conversations) {
    chatsByPatient.set(c.patientId, (chatsByPatient.get(c.patientId) ?? 0) + 1);
    const prev = lastActivityByPatient.get(c.patientId);
    if (!prev || c.updatedAt > prev) lastActivityByPatient.set(c.patientId, c.updatedAt);
  }

  const pendingTotal = [...pendingByPatient.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="admin-main page-view">
      <div className="page-head">
        <div className="page-head-copy">
          <h2>Patients</h2>
          <p>Open a patient to review their threads and message them as clinic staff.</p>
        </div>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-num">{patients.length}</span>
            <span className="stat-label">Patients</span>
          </div>
          <div className="stat">
            <span className="stat-num">{pendingTotal}</span>
            <span className="stat-label">Pending requests</span>
          </div>
          <div className="stat">
            <span className="stat-num">{conversations.length}</span>
            <span className="stat-label">Conversations</span>
          </div>
        </div>
      </div>

      <div className="patient-list">
        {patients.map((p) => {
          const pending = pendingByPatient.get(p.patient_id) ?? 0;
          const chats = chatsByPatient.get(p.patient_id) ?? 0;
          const last = lastActivityByPatient.get(p.patient_id);
          return (
            <div key={p.patient_id} className="patient-row" onClick={() => onSelect(p.patient_id)}>
              <div className="avatar">{initials(p.name)}</div>
              <div className="patient-row-id">
                <div className="name">{p.name}</div>
                <div className="sub">Goes by {p.preferred_name}</div>
              </div>
              <div className="patient-row-meta">
                {pending > 0 ? (
                  <span className="chip warn">{pending} pending</span>
                ) : (
                  <span className="chip">Clear</span>
                )}
                <span className="meta-item">
                  {chats} chat{chats === 1 ? '' : 's'}
                </span>
                <span className="meta-item">{last ? `active ${shortTime(last)}` : 'no activity yet'}</span>
              </div>
              <IconChevronRight size={15} className="chevron" />
            </div>
          );
        })}
        {patients.length === 0 && <div className="empty-state">No patients on file.</div>}
      </div>
    </div>
  );
}
