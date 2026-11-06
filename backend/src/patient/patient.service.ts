import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface PatientRecord {
  patient_id: string;
  name: string;
  preferred_name: string;
  date_of_birth: string;
  language: string;
  phone: string;
  conditions: string[];
  medications: { name: string; dose: string; frequency: string; refills_remaining: number }[];
  pharmacy: string;
  insurance: { payer: string; plan: string };
  last_visit: { date: string; provider: string; reason: string; plan_note: string };
  upcoming_appointments: { date: string; time: string; provider: string; type: string; status: string }[];
  balance: { amount: number; reason: string };
}

const dataPath = fileURLToPath(new URL('../data/alex_morgan.json', import.meta.url));
const PATIENT: PatientRecord = JSON.parse(readFileSync(dataPath, 'utf-8'));

/**
 * Phase 1 has exactly one synthetic patient. Every inbound message is
 * treated as coming from Alex's phone on file, so there is no lookup by
 * phone number here (that belongs to Phase 2 Track C's verification flow).
 * `list`/`getById` exist mainly so the admin "patient list" screen and its
 * authorization checks are shaped to scale past one patient later.
 */
@Injectable()
export class PatientService {
  getRecord(): PatientRecord {
    return PATIENT;
  }

  list(): PatientRecord[] {
    return [PATIENT];
  }

  getById(patientId: string): PatientRecord | undefined {
    return PATIENT.patient_id === patientId ? PATIENT : undefined;
  }
}
