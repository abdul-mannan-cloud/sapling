import { useEffect, useState } from 'react';
import { api } from '../api';
import { useHandoffs } from '../shared/useHandoffs';
import { HANDOFF_ICONS, IconChevronRight } from '../components/Icons';
import type { HandoffRecord, HandoffStatus, PatientSummary } from '../types';

const TYPE_LABEL: Record<HandoffRecord['type'], string> = {
  appointment_request: 'Appointment request',
  refill: 'Refill',
  clinical_question: 'Clinical question',
  billing: 'Billing',
  other: 'Other',
  emergency: 'Emergency',
};

const COLUMNS: { status: HandoffStatus; title: string; hint: string; empty: string }[] = [
  {
    status: 'pending_staff',
    title: 'Pending staff',
    hint: 'awaiting human action — emergencies pinned to the top',
    empty: 'Queue is clear — nothing is waiting on staff.',
  },
  {
    status: 'resolved',
    title: 'Resolved',
    hint: 'staff completed the requested action',
    empty: 'Nothing resolved yet.',
  },
  {
    status: 'cancelled',
    title: 'Cancelled',
    hint: 'closed without action',
    empty: 'Nothing cancelled.',
  },
];

function shortTime(iso: string) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * The staff queue as a kanban board: one column per status, so resolved and
 * cancelled work never mixes with what still needs a human. Pending sorts
 * emergencies first, then newest activity. The agent only ever files into
 * the first column — cards move out of it solely through the actions here.
 */
export function AllHandoffsView({ onOpenPatient }: { onOpenPatient: (patientId: string, conversationId?: string) => void }) {
  const { handoffs, setStatus } = useHandoffs();
  const [patients, setPatients] = useState<Record<string, PatientSummary>>({});

  useEffect(() => {
    api.listPatients().then((list) => {
      setPatients(Object.fromEntries(list.map((p) => [p.patient_id, p])));
    });
  }, []);

  const columns = COLUMNS.map((col) => ({
    ...col,
    cards: handoffs
      .filter((h) => h.status === col.status)
      .sort((a, b) => {
        if (col.status === 'pending_staff') {
          const emergencyFirst = Number(b.type === 'emergency') - Number(a.type === 'emergency');
          if (emergencyFirst !== 0) return emergencyFirst;
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
  }));

  return (
    <div className="admin-main board-view">
      <div className="board-head">
        <div>
          <h2 className="section-title">Staff queue</h2>
          <p className="section-sub">
            Requests the agent files for human action — it never books, approves refills or edits records. Acting on a
            card here is the only way its status changes.
          </p>
        </div>
      </div>

      <div className="board-scroll">
        <div className="handoff-board">
          {columns.map((col) => (
            <section key={col.status} className={`board-col c-${col.status}`}>
              <header className="board-col-head">
                <span className="board-col-dot" aria-hidden="true" />
                <span className="board-col-title">{col.title}</span>
                <span className="board-col-count">{col.cards.length}</span>
                {col.status === 'pending_staff' && col.cards.some((c) => c.type === 'emergency') && (
                  <span className="board-col-flag">emergency</span>
                )}
              </header>
              <div className="board-col-hint">{col.hint}</div>
              <div className="board-col-body">
                {col.cards.length === 0 && <div className="board-empty">{col.empty}</div>}
                {col.cards.map((h) => {
                  const TypeIcon = HANDOFF_ICONS[h.type];
                  const pending = h.status === 'pending_staff';
                  // A record created and never touched again vs. one the
                  // agent revisited after a later message (e.g. "actually,
                  // Thursday instead") — the clearest "what did the agent
                  // actually do" signal a card can carry without a full
                  // separate activity log.
                  const wasUpdated = h.updatedAt !== h.createdAt;
                  return (
                    <article
                      key={h.id}
                      className={`handoff-card${h.type === 'emergency' ? ' emergency' : ''}${pending ? '' : ' done'}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenPatient(h.patientId, h.conversationId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onOpenPatient(h.patientId, h.conversationId);
                      }}
                    >
                      <header className="handoff-head">
                        <span className={`handoff-type t-${h.type}`}>
                          <TypeIcon size={14} />
                          {TYPE_LABEL[h.type]}
                        </span>
                        <IconChevronRight size={14} className="handoff-open-hint" />
                      </header>
                      <div className="handoff-patient">{patients[h.patientId]?.name ?? h.patientId}</div>
                      <dl className="handoff-details">
                        {Object.entries(h.details).map(([k, v]) => (
                          <div key={k}>
                            <dt>{k.replace(/_/g, ' ')}</dt>
                            <dd>{String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                      <footer className="handoff-foot">
                        <span title={new Date(h.createdAt).toLocaleString()}>
                          Filed {shortTime(h.createdAt)}
                          {wasUpdated && <> · updated {shortTime(h.updatedAt)}</>}
                        </span>
                        <span>
                          {h.messageIds.length} linked message{h.messageIds.length === 1 ? '' : 's'}
                        </span>
                      </footer>
                      {pending && (
                        <div className="actions" onClick={(e) => e.stopPropagation()}>
                          <button className="btn dark small" onClick={() => setStatus(h.id, 'resolved')}>
                            {h.type === 'appointment_request' ? 'Approve appointment' : 'Mark resolved'}
                          </button>
                          <button className="btn ghost small" onClick={() => setStatus(h.id, 'cancelled')}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
