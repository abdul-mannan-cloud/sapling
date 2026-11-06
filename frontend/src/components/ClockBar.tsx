import { useState } from 'react';
import { IconClock } from './Icons';

function toLocalInputValue(iso: string): string {
  // datetime-local wants "YYYY-MM-DDTHH:mm" with no timezone/offset.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The scenario clock: "now" is an app setting, not the host clock, so the
 * walkthrough can move through the script's timeline freely.
 */
export function ClockBar({
  now,
  description,
  onSet,
}: {
  now: string;
  description: string;
  onSet: (iso: string) => void;
}) {
  const [draft, setDraft] = useState(() => toLocalInputValue(now));

  return (
    <div className="clock-control" title="Scenario clock — controls what “now” means to the agent">
      <IconClock size={14} />
      <span className="clock-desc">{description}</span>
      <input type="datetime-local" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Scenario clock date and time" />
      <button className="btn ghost small" onClick={() => onSet(new Date(draft).toISOString())}>
        Set
      </button>
    </div>
  );
}
