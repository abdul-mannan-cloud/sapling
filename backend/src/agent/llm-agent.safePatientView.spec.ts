import { describe, expect, it } from 'vitest';
import { buildAgentSafePatientView } from './llm-agent.service.js';
import { PatientService } from '../patient/patient.service.js';

const patient = new PatientService().getRecord();

describe('buildAgentSafePatientView', () => {
  it('withholds fields no scenario answer needs (least privilege for the third-party LLM call)', () => {
    const view = buildAgentSafePatientView(patient) as Record<string, unknown>;
    expect(view).not.toHaveProperty('patient_id');
    expect(view).not.toHaveProperty('date_of_birth');
    expect(view).not.toHaveProperty('phone');
    expect(view).not.toHaveProperty('language');
    expect(view).not.toHaveProperty('insurance');
    expect(view).not.toHaveProperty('name');
  });

  it('keeps every field an actual scenario answer depends on', () => {
    const view = buildAgentSafePatientView(patient) as Record<string, unknown>;
    expect(view.preferred_name).toBe(patient.preferred_name);
    expect(view.medications).toEqual(patient.medications);
    expect(view.pharmacy).toBe(patient.pharmacy);
    expect(view.last_visit).toEqual(patient.last_visit);
    expect(view.upcoming_appointments).toEqual(patient.upcoming_appointments);
    expect(view.balance).toEqual(patient.balance);
  });
});
