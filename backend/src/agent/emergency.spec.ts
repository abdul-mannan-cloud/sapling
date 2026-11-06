import { describe, expect, it } from 'vitest';
import { isEmergency } from './emergency.js';

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
