import { describe, expect, it } from 'vitest';
import { mergeDetails, mergeMessageIds } from './handoff.utils.js';

describe('mergeDetails', () => {
  it('overwrites only the patched fields, keeping the rest', () => {
    const existing = { reason: 'BP recheck', provider: 'Dr. Priya Lee', date: '2026-11-10', window: 'afternoon' };
    const patched = mergeDetails(existing, { date: '2026-11-12' });
    expect(patched).toEqual({ reason: 'BP recheck', provider: 'Dr. Priya Lee', date: '2026-11-12', window: 'afternoon' });
  });

  it('does not mutate the original object', () => {
    const existing = { a: 1 };
    mergeDetails(existing, { a: 2 });
    expect(existing).toEqual({ a: 1 });
  });
});

describe('mergeMessageIds', () => {
  it('appends new ids and de-duplicates', () => {
    expect(mergeMessageIds(['m1', 'm2'], ['m2', 'm3'])).toEqual(['m1', 'm2', 'm3']);
  });

  it('is a no-op when nothing new is appended', () => {
    expect(mergeMessageIds(['m1'], [])).toEqual(['m1']);
  });
});
