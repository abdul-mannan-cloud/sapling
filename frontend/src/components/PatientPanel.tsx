import type { OpenSlot, PatientRecord } from '../types';

export function PatientPanel({
  patient,
  faq,
  openSlots,
}: {
  patient: PatientRecord | null;
  faq: string;
  openSlots: OpenSlot[];
}) {
  if (!patient) return <div className="panel">Loading…</div>;

  return (
    <div className="panel">
      <h2>Patient</h2>
      <div className="field">
        <strong>{patient.name}</strong> ({patient.preferred_name})
      </div>
      <div className="field">
        <span className="label">DOB:</span> {patient.date_of_birth}
      </div>
      <div className="field">
        <span className="label">Phone on file:</span> {patient.phone}
      </div>
      <div className="field">
        {patient.conditions.map((c) => (
          <span key={c} className="pill condition">
            {c}
          </span>
        ))}
      </div>

      <h2>Medications</h2>
      {patient.medications.map((m) => (
        <div className="field" key={m.name}>
          {m.name} {m.dose}, {m.frequency} — {m.refills_remaining} refills left
        </div>
      ))}
      <div className="field">
        <span className="label">Pharmacy:</span> {patient.pharmacy}
      </div>

      <h2>Last visit</h2>
      <div className="field">
        {patient.last_visit.date} — {patient.last_visit.reason} ({patient.last_visit.provider})
      </div>
      <div className="field">
        <span className="label">Plan:</span> {patient.last_visit.plan_note}
      </div>

      <h2>Upcoming appointments</h2>
      {patient.upcoming_appointments.map((a, i) => (
        <div className="field" key={i}>
          {a.date} {a.time} — {a.type} ({a.status})
        </div>
      ))}

      <h2>Balance</h2>
      <div className="field">
        ${patient.balance.amount.toFixed(2)} — {patient.balance.reason}
      </div>

      <h2>Open slots (read-only)</h2>
      {openSlots.map((s, i) => (
        <div className="slot-row" key={i}>
          {s.date} {s.start} — {s.provider}
        </div>
      ))}

      <h2>Clinic FAQ</h2>
      <div className="faq-text">{faq}</div>
    </div>
  );
}
