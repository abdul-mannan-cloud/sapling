import { describe, expect, it } from 'vitest';
import { EMERGENCY_REPLY_TEXT, EMERGENCY_REPLY_VOICE, emergencyReplyFor, isEmergency } from './emergency.js';

describe('isEmergency', () => {
  it('flags the scripted step 11 message', () => {
    expect(isEmergency('I have chest pain and my left arm feels numb')).toBe(true);
  });

  it.each([
    "can't breathe",
    'I think I am having a stroke, my face is drooping',
    'he passed out and is not breathing',
    'I want to kill myself',
    'I took an overdose',
    'severe bleeding that won\'t stop',
  ])('flags "%s"', (text) => {
    expect(isEmergency(text)).toBe(true);
  });

  // Regression cases for paraphrases of the step 11 scripted message that
  // the original pattern list missed (reordered "chest pain", "numb" swapped
  // for "tingling") — a purely literal keyword gate only ever covers the
  // phrasings someone thought to write down.
  it.each([
    'I have pain in my chest and my left arm is tingling',
    'there is crushing pressure in my chest',
    "I can't feel my arm and my face feels weak on one side",
    'I feel weakness on my left side and my speech is slurred',
  ])('flags the paraphrase "%s"', (text) => {
    expect(isEmergency(text)).toBe(true);
  });

  it.each([
    'what time do you close today?',
    'can I get a refill on my BP med',
    'my readings have been around 150/95 all week, should I take two pills?',
    'Tuesday afternoon works',
    'why do I owe $40?',
  ])('does not flag routine message "%s"', (text) => {
    expect(isEmergency(text)).toBe(false);
  });
});

describe('emergencyReplyFor', () => {
  it('uses "This text line" for the text channel (default)', () => {
    expect(emergencyReplyFor('text')).toBe(EMERGENCY_REPLY_TEXT);
    expect(EMERGENCY_REPLY_TEXT).toContain('This text line');
  });

  it('uses "This voice service" for the voice channel, with the rest of the sentence identical', () => {
    expect(emergencyReplyFor('voice')).toBe(EMERGENCY_REPLY_VOICE);
    expect(EMERGENCY_REPLY_VOICE).toContain('This voice service');
    // Only that one phrase should differ between the two channels.
    expect(EMERGENCY_REPLY_VOICE.replace('This voice service', 'This text line')).toBe(EMERGENCY_REPLY_TEXT);
  });
});
