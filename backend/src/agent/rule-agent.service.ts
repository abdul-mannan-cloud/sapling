import { Injectable } from '@nestjs/common';
import type { AgentContext, AgentResult } from './types.js';
import { extractWeekday, extractWindow, formatDateLong, weekdayOf, windowFromTime } from './date-utils.js';

/**
 * Deterministic fallback agent used when no OPENAI_API_KEY is configured.
 * It covers exactly the Phase 1 scenario script with keyword/intent
 * matching so the demo runs fully offline. It is intentionally narrow —
 * the LLM agent (agent/llm-agent.service.ts) is the one meant to
 * generalize beyond the scripted phrasing.
 */
@Injectable()
export class RuleAgentService {
  run(ctx: AgentContext): AgentResult {
    const text = ctx.currentMessage.body.trim();
    const lower = text.toLowerCase();
    const patient = ctx.patient;
    const existingApptReq = ctx.handoffs.find(
      (h) => h.type === 'appointment_request' && h.status === 'pending_staff',
    );

    // Steps 2 & 3: a weekday mention resolves against the real open slots,
    // not generic calendar math, so "Thursday" lands on the Nov 12 slot
    // rather than the nearer-but-not-offered Nov 5.
    const weekday = extractWeekday(lower);
    if (weekday) {
      const slot = ctx.openSlots.find((s) => weekdayOf(s.date) === weekday);
      if (slot) {
        const window = extractWindow(lower) ?? windowFromTime(slot.start);
        const details = { reason: 'BP recheck', provider: slot.provider, date: slot.date, window };
        const dateText = formatDateLong(slot.date);
        if (existingApptReq) {
          return {
            mode: 'rule',
            reply: `Got it — I've updated your request to ${dateText} (${window}). Still pending staff review; we'll let you know once it's booked.`,
            handoffAction: { operation: 'update', handoffId: existingApptReq.id, type: 'appointment_request', details },
          };
        }
        return {
          mode: 'rule',
          reply: `Thanks — I've requested ${dateText} (${window}) for your BP recheck with ${slot.provider}. This is pending staff review; they'll confirm the exact time.`,
          handoffAction: { operation: 'create', type: 'appointment_request', details },
        };
      }
    }

    // Step 1: affirmative reply to the clinic's outbound recheck proposal.
    if (/^(yes|yeah|yep|sure|ok(ay)?)\b/.test(lower) && !existingApptReq) {
      const options = ctx.openSlots.map((s) => `${formatDateLong(s.date)} at ${s.start}`).join('; ');
      return {
        mode: 'rule',
        reply: `Great — when would you like to come in for the recheck? We have openings such as ${options}, or let me know a day/time that works.`,
      };
    }

    // A bare greeting isn't a request — filing it as a handoff would be
    // exactly the kind of "avoidable staff follow-up" the brief scores
    // against. Anchored to the *whole* message (not just the start) so
    // "hi, can I get a refill" still falls through to the refill branch
    // below instead of getting swallowed here.
    if (/^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening))[!.\s]*$/i.test(lower)) {
      return {
        mode: 'rule',
        reply: `Hi ${patient.preferred_name}! I'm the Sapling Family Clinic messaging assistant. I can help with appointment requests, refills, billing questions, or general clinic info — what can I help with?`,
      };
    }

    // Step 4 — "is it booked/confirmed yet" and plain variants like "is it confirmed?".
    if (/\b(booked|confirm(ed)?)\b/.test(lower)) {
      if (existingApptReq) {
        const d = existingApptReq.details as { date: string; window: string };
        return {
          mode: 'rule',
          reply: `Not yet — your request for ${formatDateLong(d.date)} (${d.window}) is still pending staff review, not booked. Texts aren't monitored continuously, so I can't give a timeline.`,
        };
      }
      return { mode: 'rule', reply: `I don't have a pending appointment request on file for you right now.` };
    }

    // Step 5 — "next/latest/upcoming/my appointment(s)", plus "when is my appointment" phrasing.
    if (/\b(next|latest|upcoming|my)\s+appointments?\b|appointments?\b.*\bdo i have\b|when.{0,20}\bappointment/.test(lower)) {
      const upcoming = patient.upcoming_appointments[0];
      let reply = upcoming
        ? `Your next confirmed appointment is ${formatDateLong(upcoming.date)} at ${upcoming.time} with ${upcoming.provider} (${upcoming.type}).`
        : `You don't have a confirmed upcoming appointment on file.`;
      if (existingApptReq) {
        reply += ` Separately, your BP recheck is a pending request awaiting staff review — it isn't booked yet.`;
      }
      return { mode: 'rule', reply };
    }

    // Step 6
    if (/\b(close|closing|hours|open)\b/.test(lower)) {
      return {
        mode: 'rule',
        reply: `We're open Monday–Friday, 9:00 a.m.–5:00 p.m. Pacific, so we close at 5:00 p.m. Pacific today.`,
      };
    }

    // Step 7
    if (/aetna|which insurance|insurance plans?|do you (take|accept)/.test(lower)) {
      return {
        mode: 'rule',
        reply: `I don't have that on file — our FAQ doesn't list which insurance plans we accept. I'm passing this question to staff.`,
        handoffAction: { operation: 'create', type: 'other', details: { question: text } },
      };
    }

    // Step 8
    if (/refill/.test(lower)) {
      const med = patient.medications[0];
      return {
        mode: 'rule',
        reply: `I've sent a refill request for ${med.name} ${med.dose} to staff — they'll coordinate with ${patient.pharmacy}. Pending staff review.`,
        handoffAction: {
          operation: 'create',
          type: 'refill',
          details: { medication: med.name, dose: med.dose, frequency: med.frequency, pharmacy: patient.pharmacy },
        },
      };
    }

    // Step 9
    if (/\d{2,3}\s*\/\s*\d{2,3}/.test(lower) || /(take (two|2|another) pill|should i take|double.*dose)/.test(lower)) {
      const readingsMatch = text.match(/\d{2,3}\s*\/\s*\d{2,3}/);
      return {
        mode: 'rule',
        reply: `I can't give medical advice. I've shared what you told me with a clinician for review — texts aren't monitored continuously.`,
        handoffAction: {
          operation: 'create',
          type: 'clinical_question',
          details: { question: text, readings: readingsMatch?.[0] ?? null },
        },
      };
    }

    // Step 10
    if (/owe|balance|\$?40\b/.test(lower)) {
      return {
        mode: 'rule',
        reply: `That's the ${patient.balance.reason} — $${patient.balance.amount.toFixed(2)} total. You can pay online at https://pay.example.test/sapling or by phone during business hours.`,
      };
    }

    return {
      mode: 'rule',
      reply: `Thanks for letting us know. I don't have enough information to answer that directly, so I've passed it to staff for review.`,
      handoffAction: { operation: 'create', type: 'other', details: { message: text } },
    };
  }
}
