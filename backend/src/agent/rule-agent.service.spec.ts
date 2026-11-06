import { describe, expect, it } from 'vitest';
import { RuleAgentService } from './rule-agent.service.js';
import { PatientService } from '../patient/patient.service.js';
import { FaqService } from '../faq/faq.service.js';
import type { AgentContext } from './types.js';
import type { HandoffRecord } from '../handoffs/handoff.types.js';

const patient = new PatientService().getRecord();
const faq = new FaqService();
const agent = new RuleAgentService();

function buildContext(body: string, handoffs: HandoffRecord[] = []): AgentContext {
  const currentMessage = { id: 'm-current', sender: 'patient' as const, body, createdAt: new Date().toISOString() };
  return {
    nowIso: '2026-11-04T10:00:00-08:00',
    nowDescription: 'Wednesday, November 4, 2026 at 10:00 AM Pacific',
    patient,
    faqText: faq.getFaqText(),
    openSlots: faq.getOpenSlots(),
    history: [currentMessage],
    handoffs,
    currentMessage,
  };
}

const pendingApptRequest: HandoffRecord = {
  id: 'h-appt-1',
  patientId: patient.patient_id,
  conversationId: 'convo-1',
  type: 'appointment_request',
  status: 'pending_staff',
  details: { reason: 'BP recheck', provider: 'Dr. Priya Lee', date: '2026-11-10', window: 'afternoon' },
  messageIds: ['m-earlier'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('RuleAgentService — Phase 1 scenario script', () => {
  it('step 1: "yes" with no pending request asks when Alex prefers to come in, without a handoff', () => {
    const result = agent.run(buildContext('yes'));
    expect(result.handoffAction).toBeUndefined();
    expect(result.reply.toLowerCase()).toContain('when');
  });

  it('step 2: "Tuesday afternoon works" creates one appointment_request for Nov 10', () => {
    const result = agent.run(buildContext('Tuesday afternoon works'));
    expect(result.handoffAction).toMatchObject({
      operation: 'create',
      type: 'appointment_request',
      details: { reason: 'BP recheck', provider: 'Dr. Priya Lee', date: '2026-11-10', window: 'afternoon' },
    });
    expect(result.reply).toContain('pending staff review');
  });

  it('step 3: "actually can we do Thursday instead" updates the existing request to Nov 12, not a new one', () => {
    const result = agent.run(buildContext('actually can we do Thursday instead', [pendingApptRequest]));
    expect(result.handoffAction).toMatchObject({
      operation: 'update',
      handoffId: 'h-appt-1',
      type: 'appointment_request',
      details: { date: '2026-11-12', window: 'afternoon' },
    });
  });

  it('step 4: "is it booked yet?" reports pending, not booked, with no fabricated timeline', () => {
    const result = agent.run(buildContext('is it booked yet?', [pendingApptRequest]));
    expect(result.handoffAction).toBeUndefined();
    expect(result.reply).toContain('pending staff review');
    expect(result.reply.toLowerCase()).toContain('not booked');
  });

  it('step 4 (no request on file): says there is no pending request, never claims one exists', () => {
    const result = agent.run(buildContext('is it booked yet?'));
    expect(result.reply.toLowerCase()).toContain("don't have a pending appointment request");
  });

  it('step 5: distinguishes the booked Jan 2027 physical from the pending BP recheck request', () => {
    const result = agent.run(buildContext('when is my next appointment?', [pendingApptRequest]));
    expect(result.reply).toContain('January 14, 2027');
    expect(result.reply.toLowerCase()).toContain('pending request');
  });

  it('step 6: gives the FAQ closing time', () => {
    const result = agent.run(buildContext('what time do you close today?'));
    expect(result.reply).toContain('5:00 p.m. Pacific');
  });

  it('step 7: unknown policy (Aetna) is never guessed, and is filed for staff', () => {
    const result = agent.run(buildContext('do you take Aetna?'));
    expect(result.handoffAction).toMatchObject({ operation: 'create', type: 'other' });
    expect(result.reply.toLowerCase()).not.toContain('yes, we accept');
  });

  it('step 8: refill request uses the record\'s medication/pharmacy without asking Alex for them', () => {
    const result = agent.run(buildContext('can I get a refill on my BP med'));
    expect(result.handoffAction).toMatchObject({
      operation: 'create',
      type: 'refill',
      details: { medication: 'Lisinopril', dose: '10 mg', pharmacy: patient.pharmacy },
    });
  });

  it('step 9: never gives medical advice; files a clinical_question with the readings captured', () => {
    const result = agent.run(buildContext('my readings have been around 150/95 all week, should I take two pills?'));
    expect(result.reply.toLowerCase()).toContain("can't give medical advice");
    expect(result.handoffAction).toMatchObject({
      operation: 'create',
      type: 'clinical_question',
      details: { readings: '150/95' },
    });
  });

  it('step 10: answers the balance from the record and includes the FAQ payment link', () => {
    const result = agent.run(buildContext('why do I owe $40?'));
    expect(result.reply).toContain('Copay for Oct 6, 2026 visit');
    expect(result.reply).toContain('https://pay.example.test/sapling');
    expect(result.handoffAction).toBeUndefined();
  });

  it('unmatched messages are never silently dropped — they fall back to an "other" handoff', () => {
    const result = agent.run(buildContext('can you also update my mailing address'));
    expect(result.handoffAction).toMatchObject({ operation: 'create', type: 'other' });
  });

  it.each(['hello', 'hi', 'Hey!', 'hiya', 'good morning'])(
    'a bare greeting ("%s") gets a friendly reply with no handoff — not an avoidable staff follow-up',
    (greeting) => {
      const result = agent.run(buildContext(greeting));
      expect(result.handoffAction).toBeUndefined();
      expect(result.reply).toContain(patient.preferred_name);
    },
  );

  it('a greeting attached to a real request still routes to that request, not the generic greeting reply', () => {
    const result = agent.run(buildContext('hi, can I get a refill on my BP med'));
    expect(result.handoffAction).toMatchObject({ operation: 'create', type: 'refill' });
  });

  it.each(['latest appointment', 'let me know of my latest appointments', 'my upcoming appointment', 'when is my appointment'])(
    'natural paraphrases of "next appointment" ("%s") still answer, instead of falling through to the generic handoff',
    (phrase) => {
      const result = agent.run(buildContext(phrase));
      expect(result.handoffAction).toBeUndefined();
      expect(result.reply).toContain('January 14, 2027');
    },
  );

  it('"is it confirmed?" is treated the same as "is it booked yet?"', () => {
    const result = agent.run(buildContext('is it confirmed?', [pendingApptRequest]));
    expect(result.handoffAction).toBeUndefined();
    expect(result.reply.toLowerCase()).toContain('not booked');
  });
});
