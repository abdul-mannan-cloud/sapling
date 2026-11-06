/**
 * Deterministic emergency detection. This runs in application code, never
 * delegated to the LLM, because the emergency response and handoff are a
 * hard safety requirement, not something a model should be trusted to gate.
 */
const EMERGENCY_PATTERNS: RegExp[] = [
  /chest pain/i,
  /pain.{0,15}\bchest\b/i,
  /chest\s*tight/i,
  /pressure.{0,15}\bchest\b/i,
  /crushing.{0,15}\bchest\b/i,
  /can'?t breathe/i,
  /cannot breathe/i,
  /difficulty breathing/i,
  /trouble breathing/i,
  /short(ness)? of breath/i,
  /\bnumb(ness)?\b/i,
  /\btingl(e|ing|es)\b/i,
  /can'?t feel (my )?(arm|leg|face|hand|foot)/i,
  /weak(ness)?.{0,20}\bside\b/i,
  /face (is )?droop/i,
  /slurred speech/i,
  /\bstroke\b/i,
  /heart attack/i,
  /unconscious/i,
  /passed out/i,
  /losing consciousness/i,
  /not breathing/i,
  /severe bleeding/i,
  /bleeding (a lot|heavily|won'?t stop)/i,
  /overdose/i,
  /suicid/i,
  /want(ing)? to die/i,
  /kill myself/i,
  /anaphyla/i,
  /allergic reaction.*(throat|swelling|can'?t breathe)/i,
  /choking/i,
  /seizure/i,
  /convulsing/i,
];

export function isEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
}

export const EMERGENCY_REPLY_TEXT =
  'If you think you are having a medical emergency, call 911 or go to the nearest emergency room now. This text line is not monitored continuously and cannot help in an emergency.';

/** Required wording for the voice channel — same message, "This voice service" in place of "This text line". */
export const EMERGENCY_REPLY_VOICE =
  'If you think you are having a medical emergency, call 911 or go to the nearest emergency room now. This voice service is not monitored continuously and cannot help in an emergency.';

export function emergencyReplyFor(channel: 'text' | 'voice'): string {
  return channel === 'voice' ? EMERGENCY_REPLY_VOICE : EMERGENCY_REPLY_TEXT;
}
