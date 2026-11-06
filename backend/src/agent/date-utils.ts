const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Parses a plain "YYYY-MM-DD" calendar date without any timezone shifting. */
function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function weekdayOf(dateStr: string): string {
  return WEEKDAY_NAMES[parseDateOnly(dateStr).getUTCDay()];
}

export function formatDateLong(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDateOnly(dateStr));
}

export function windowFromTime(start: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number(start.split(':')[0]);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function extractWeekday(text: string): string | undefined {
  return WEEKDAY_NAMES.find((day) => new RegExp(`\\b${day}\\b`, 'i').test(text));
}

export function extractWindow(text: string): 'morning' | 'afternoon' | 'evening' | undefined {
  const match = text.match(/\b(morning|afternoon|evening)\b/i);
  return match ? (match[1].toLowerCase() as 'morning' | 'afternoon' | 'evening') : undefined;
}
