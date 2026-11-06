import type { PatientSummary } from '../types';

export function PatientListView({ patients, onSelect }: { patients: PatientSummary[]; onSelect: (id: string) => void }) {
  return (
    <div className="admin-main">
      <h2 className="section-title">Patients</h2>
      <div className="patient-grid">
        {patients.map((p) => (
          <div key={p.patient_id} className="patient-card" onClick={() => onSelect(p.patient_id)}>
            <div className="patient-card-name">{p.name}</div>
            <div className="patient-card-sub">Preferred name: {p.preferred_name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
