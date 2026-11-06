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

  it('strips stray JSON syntax a model occasionally appends to a free-text field', () => {
    // Observed from gpt-4o-mini in practice: "13:30}}}}}]}" instead of "13:30".
    expect(pruneNulls({ slot_start: '13:30}}}}}]}' })).toEqual({ slot_start: '13:30' });
    expect(pruneNulls({ window: 'afternoon}}}]}' })).toEqual({ window: 'afternoon' });
  });

  it('leaves ordinary values with no stray syntax untouched', () => {
    expect(pruneNulls({ question: 'do you take Aetna?' })).toEqual({ question: 'do you take Aetna?' });
  });
});
