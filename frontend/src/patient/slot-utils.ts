import type { OpenSlot } from '../types';

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function weekdayLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(parseDateOnly(dateStr));
}

export function windowFromTime(start: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(start.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** Unique (weekday, window) combinations across the open slots, e.g. "Tuesday afternoon" — matches exactly what the rule-based agent's keyword matcher expects. */
export function dayWindowOptions(slots: OpenSlot[]): { label: string; phrase: string }[] {
  const seen = new Set<string>();
  const options: { label: string; phrase: string }[] = [];
  for (const slot of slots) {
    const weekday = weekdayLabel(slot.date);
    const window = windowFromTime(slot.start);
    const key = `${weekday}-${window}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ label: `${weekday} ${window}`, phrase: `${weekday} ${window} works` });
  }
  return options;
}
