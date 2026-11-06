import { Injectable } from '@nestjs/common';
import type { AgentContext, AgentResult } from './types.js';
import { extractWeekday, extractWindow, formatDateLong, weekdayOf, weekdayOfInstant, windowFromTime } from './date-utils.js';

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

    // Step 9 — dosing/clinical-safety questions take precedence over every
    // other branch. A message that bundles a scheduling or refill ask with
    // a clinical question (e.g. "Tuesday works; my readings are 150/95,
    // should I take two pills?") must never let the clinical half get
    // silently swallowed by a keyword match further down — the "never give
    // medical advice, always escalate" rule can't depend on which intent
    // happens to appear first in the sentence.
    if (
      /\d{2,3}\s*\/\s*\d{2,3}/.test(lower) ||
      /(take (two|2|another) pill|should i take|double.{0,20}(dose|med|medication|pill))/.test(lower)
    ) {
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

    // Step 6 — hours/open-day. Checked before weekday extraction so "are
    // you open Tuesday?" answers the FAQ question instead of being
    // swallowed as a scheduling intent just because it names a weekday.
    // Respects the scenario clock's actual day, not a hardcoded weekday.
    if (/\b(close|closing|hours|open)\b/.test(lower)) {
      const today = weekdayOfInstant(ctx.nowIso);
      const isWeekend = today === 'saturday' || today === 'sunday';
      return {
        mode: 'rule',
        reply: isWeekend
          ? `We're closed today — open Monday–Friday, 9:00 a.m.–5:00 p.m. Pacific.`
          : `We're open Monday–Friday, 9:00 a.m.–5:00 p.m. Pacific, so we close at 5:00 p.m. Pacific today.`,
      };
    }

    // Covered directly by the FAQ, so this shouldn't need staff review.
    // Anchored to asking about the CLINIC's location, not e.g. "update my
    // mailing address" (a contact-info change, which falls through to the
    // catch-all as it should — this agent never edits the patient record).
    if (/\b(where are you|your address|clinic address|located|parking)\b/.test(lower)) {
      return {
        mode: 'rule',
        reply: `We're at 1200 Example Ave, Suite 300, Springfield, CA 90000 — free parking in the garage behind the building.`,
      };
    }

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
        if (existingApptReq && ctx.conversationId && existingApptReq.conversationId !== ctx.conversationId) {
          return { mode: 'rule', reply: `You already have a pending appointment request for ${String(existingApptReq.details.date ?? 'an unspecified date')}. Please open its original chat to change it. If you want an additional appointment, please say so.` };
        }
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

    // Step 4 — status queries: "is it booked/confirmed/approved/pending yet", and synonyms.
    // Excludes "refill" so "what is the status of my refill?" reaches the
    // refill branch's own status check below instead of being answered as
    // if it were asking about the appointment request.
    if (/\b(status|pending|approved|booked|confirm(ed)?|finished|submitted|cancelled)\b/.test(lower) && !/refill/.test(lower)) {
      if (existingApptReq) {
        const d = existingApptReq.details as { date: string; window: string };
        return {
          mode: 'rule',
          reply: `Not yet — your request for ${formatDateLong(d.date)} (${d.window}) is still pending staff review, not booked. Texts aren't monitored continuously, so I can't give a timeline.`,
        };
      }
      const resolved = ctx.handoffs.filter((h) => h.type === 'appointment_request' && h.status === 'resolved');
      if (resolved.length) {
        return {
          mode: 'rule',
          reply: resolved
            .map((h) => `Staff approved your appointment request for ${[h.details.date, h.details.slot_start || h.details.window, h.details.provider].filter(Boolean).join(', ')}.`)
            .join(' '),
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
      for (const request of ctx.handoffs.filter((h) => h.type === 'appointment_request' && h.status === 'resolved')) {
        reply += ` Staff approved your appointment request for ${[request.details.date, request.details.slot_start || request.details.window, request.details.provider].filter(Boolean).join(', ')}.`;
      }
      return { mode: 'rule', reply };
    }

    // Step 7
    if (/aetna|which insurance|insurance plans?|do you (take|accept)/.test(lower)) {
      return {
        mode: 'rule',
        reply: `I don't have that on file — our FAQ doesn't list which insurance plans we accept. I'm passing this question to staff.`,
        handoffAction: { operation: 'create', type: 'other', details: { question: text } },
      };
    }

    // Step 8 — also answers "what is the status of my refill?" and avoids
    // filing a second refill handoff when one is already pending (the same
    // "update, don't duplicate" principle applied to appointment requests).
    if (/refill/.test(lower)) {
      const existingRefill = ctx.handoffs.find((h) => h.type === 'refill' && h.status === 'pending_staff');
      if (/\b(status|pending|approved|confirm(ed)?|finished|submitted|cancelled)\b/.test(lower)) {
        if (existingRefill) {
          return { mode: 'rule', reply: `Your refill request for ${existingRefill.details.medication} is still pending staff review.` };
        }
        const resolvedRefill = ctx.handoffs.find((h) => h.type === 'refill' && h.status === 'resolved');
        if (resolvedRefill) {
          return { mode: 'rule', reply: `Staff already handled your refill request for ${resolvedRefill.details.medication}.` };
        }
        return { mode: 'rule', reply: `You don't have a refill request on file right now.` };
      }
      if (existingRefill) {
        return { mode: 'rule', reply: `You already have a refill request for ${existingRefill.details.medication} pending staff review — no need to send it again.` };
      }
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

    // Step 10
    if (/owe|balance|\$?40\b/.test(lower)) {
      return {
        mode: 'rule',
        reply: `That's the ${patient.balance.reason} — $${patient.balance.amount.toFixed(2)} total. You can pay online at https://pay.example.test/sapling or by phone during business hours.`,
      };
    }

    return {
      mode: 'rule',
      reply: `I'm not sure what you meant, so I've flagged this for staff to review. In the meantime, here's what I can help with directly:`,
      handoffAction: { operation: 'create', type: 'other', details: { message: text } },
    };
  }
}
