import { describe, expect, it } from 'vitest';
import { pruneNulls } from './llm-agent.service.js';

describe('pruneNulls', () => {
  it('drops null/undefined fields so handoff details only contain what is relevant to the type', () => {
    const raw = {
      reason: 'BP recheck',
      provider: 'Dr. Priya Lee',
      date: '2026-11-10',
      window: 'afternoon',
      medication: null,
      dose: null,
      question: null,
    };
    expect(pruneNulls(raw)).toEqual({
      reason: 'BP recheck',
      provider: 'Dr. Priya Lee',
      date: '2026-11-10',
      window: 'afternoon',
    });
  });

  it('returns an empty object when everything is null', () => {
    expect(pruneNulls({ a: null, b: null })).toEqual({});
  });
});
