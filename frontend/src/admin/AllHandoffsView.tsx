import { useEffect, useState } from 'react';
import { api } from '../api';
import { useHandoffs } from '../shared/useHandoffs';
import type { HandoffRecord, PatientSummary } from '../types';

const TYPE_LABEL: Record<HandoffRecord['type'], string> = {
  appointment_request: 'Appointment request',
  refill: 'Refill',
  clinical_question: 'Clinical question',
  billing: 'Billing',
  other: 'Other',
  emergency: 'EMERGENCY',
};

export function AllHandoffsView({ onOpenPatient }: { onOpenPatient: (patientId: string, conversationId?: string) => void }) {
  const { handoffs, setStatus } = useHandoffs();
  const [patients, setPatients] = useState<Record<string, PatientSummary>>({});

  useEffect(() => {
    api.listPatients().then((list) => {
      setPatients(Object.fromEntries(list.map((p) => [p.patient_id, p])));
    });
  }, []);

  return (
    <div className="admin-main">
      <h2 className="section-title">All handoffs</h2>
      {handoffs.length === 0 && <div className="empty-state">Nothing pending.</div>}
      <div className="handoff-grid">
        {handoffs.map((h) => (
          <div key={h.id} className={`handoff-card${h.type === 'emergency' ? ' emergency' : ''}`}>
            <div className="top">
              <span className="handoff-type">{TYPE_LABEL[h.type]}</span>
              <span className={`status-badge ${h.status}`}>{h.status.replace('_', ' ')}</span>
            </div>
            <div className="details">
              <div>
                <span className="label">patient:</span>{' '}
                <a onClick={() => onOpenPatient(h.patientId, h.conversationId)}>{patients[h.patientId]?.name ?? h.patientId}</a>
              </div>
              {Object.entries(h.details).map(([k, v]) => (
                <div key={k}>
                  <span className="label">{k}:</span> {String(v)}
                </div>
              ))}
            </div>
            <div className="details">
              <div>Updated {new Date(h.updatedAt).toLocaleString()}</div>
              <div>{h.messageIds.length} linked message(s)</div>
            </div>
            {h.status === 'pending_staff' && (
              <div className="actions">
                <button className="small" onClick={() => setStatus(h.id, 'resolved')}>
                  Mark resolved
                </button>
                <button className="small" onClick={() => setStatus(h.id, 'cancelled')}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
