import { describe, expect, it } from 'vitest';
import { extractWeekday, extractWindow, formatDateLong, weekdayOf, windowFromTime } from './date-utils.js';

describe('date-utils', () => {
  it('computes the correct weekday for the scenario open slots', () => {
    expect(weekdayOf('2026-11-10')).toBe('tuesday');
    expect(weekdayOf('2026-11-12')).toBe('thursday');
    expect(weekdayOf('2026-11-04')).toBe('wednesday');
  });

  it('formats a long human-readable date without timezone shift', () => {
    expect(formatDateLong('2026-11-10')).toBe('Tuesday, November 10, 2026');
  });

  it('derives morning/afternoon/evening from a 24h start time', () => {
    expect(windowFromTime('09:30')).toBe('morning');
    expect(windowFromTime('14:00')).toBe('afternoon');
    expect(windowFromTime('18:00')).toBe('evening');
  });

  it('extracts a mentioned weekday case-insensitively', () => {
    expect(extractWeekday('actually can we do Thursday instead')).toBe('thursday');
    expect(extractWeekday('Tuesday afternoon works')).toBe('tuesday');
    expect(extractWeekday('is it booked yet?')).toBeUndefined();
  });

  it('extracts a mentioned time-of-day window', () => {
    expect(extractWindow('Tuesday afternoon works')).toBe('afternoon');
    expect(extractWindow('Tuesday works')).toBeUndefined();
  });
});
