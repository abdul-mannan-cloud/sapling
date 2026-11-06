import type { OpenSlot, PatientRecord } from '../types';
import { markdownLite } from '../shared/markdown-lite';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function weekdayShort(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * The record rail shown next to the thread in both roles. This mirrors what
 * the agent is allowed to see (minus the fields deliberately withheld from
 * the model), so staff and patient can eyeball exactly what answers are
 * derivable without a human.
 */
export function PatientPanel({
  patient,
  faq,
  openSlots,
}: {
  patient: PatientRecord | null;
  faq: string;
  openSlots: OpenSlot[];
}) {
  if (!patient) return <div className="panel record-panel loading-state">Loading record…</div>;

  return (
    <div className="panel record-panel">
      <div className="record-head">
        <div className="avatar">{initials(patient.name)}</div>
        <div>
          <div className="record-name">{patient.name}</div>
          <div className="record-sub">
            Goes by {patient.preferred_name} · DOB {patient.date_of_birth}
          </div>
        </div>
      </div>

      <section className="record-section">
        <h3>Contact</h3>
        <div className="field">
          <span className="label">Phone on file</span>
          <br />
          {patient.phone}
        </div>
        {patient.conditions.length > 0 && (
          <div className="field" style={{ marginTop: 8 }}>
            {patient.conditions.map((c) => (
              <span key={c} className="pill condition">
                {c}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="record-section">
        <h3>Medications</h3>
        {patient.medications.map((m) => (
          <div className="med-row" key={m.name}>
            <div className="med-name">
              {m.name} {m.dose}
            </div>
            <div className="med-sub">
              {m.frequency} · {m.refills_remaining} refills left
            </div>
          </div>
        ))}
        <div className="field" style={{ marginTop: 8 }}>
          <span className="label">Pharmacy</span>
          <br />
          {patient.pharmacy}
        </div>
      </section>

      <section className="record-section">
        <h3>Last visit</h3>
        <div className="field">
          {patient.last_visit.date} — {patient.last_visit.reason}
        </div>
        <div className="field">
          <span className="label">with</span> {patient.last_visit.provider}
        </div>
        <div className="plan-note">{patient.last_visit.plan_note}</div>
      </section>

      <section className="record-section">
        <h3>Upcoming appointments</h3>
        {patient.upcoming_appointments.map((a, i) => (
          <div className="med-row" key={i}>
            <div className="med-name">
              {weekdayShort(a.date)} {a.date} · {a.time}
            </div>
            <div className="med-sub">
              {a.type} · {a.provider}
            </div>
          </div>
        ))}
        {patient.upcoming_appointments.length === 0 && <div className="field">None on file.</div>}
      </section>

      <section className="record-section">
        <h3>Balance</h3>
        <div className="balance-stat">
          <span className="amount">${patient.balance.amount.toFixed(2)}</span>
          <span className="med-sub">{patient.balance.reason}</span>
        </div>
      </section>

      <section className="record-section">
        <h3>Open slots</h3>
        {openSlots.map((s, i) => (
          <div className="slot-row" key={i}>
            <span>
              {weekdayShort(s.date)} {s.date} · {s.start}
            </span>
            <span className="slot-provider">{s.provider}</span>
          </div>
        ))}
        <div className="readonly-note">Read-only — suggesting times is fine, reserving them is not.</div>
      </section>

      <section className="record-section">
        <h3>Clinic FAQ</h3>
        <div className="faq-text">{markdownLite(faq)}</div>
      </section>
    </div>
  );
}
