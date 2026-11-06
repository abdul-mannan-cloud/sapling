import { useState } from 'react';

function toLocalInputValue(iso: string): string {
  // datetime-local wants "YYYY-MM-DDTHH:mm" with no timezone/offset.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    <div className="clock-control">
      <span>
        <strong>Scenario clock:</strong> {description}
      </span>
      <input type="datetime-local" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={() => onSet(new Date(draft).toISOString())}>Set</button>
    </div>
  );
}
