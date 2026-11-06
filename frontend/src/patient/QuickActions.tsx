import { useState } from 'react';
import type { OpenSlot } from '../types';
import { dayWindowOptions } from './slot-utils';
import { IconCalendar, IconCheck, IconClock, IconDollar, IconPill } from '../components/Icons';

/**
 * Guided shortcuts for the handful of requests the agent reliably handles
 * — especially valuable in offline mode, where "can this be understood"
 * depends on keyword matching rather than an LLM. Each button sends an
 * exact phrase the rule-based agent is known to parse correctly, so the
 * patient doesn't have to guess the right wording. Free text in the
 * composer below still works for anything else; these are a shortcut,
 * not a restriction. A single-row scroller rather than wrapping chips,
 * so it reads as one calm rail instead of a ragged two-line block.
 */
export function QuickActions({ openSlots, onSend, disabled }: { openSlots: OpenSlot[]; onSend: (body: string) => void; disabled?: boolean }) {
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const slotOptions = dayWindowOptions(openSlots);

  const send = (text: string) => {
    onSend(text);
    setShowSlotPicker(false);
  };

  return (
    <div className="quick-actions">
      <div className="quick-actions-rail">
        <button disabled={disabled} className={showSlotPicker ? 'active' : ''} onClick={() => setShowSlotPicker((v) => !v)}>
          <IconCalendar size={13} />
          Schedule BP recheck
        </button>
        <button disabled={disabled} onClick={() => send('is it booked yet?')}>
          <IconCheck size={13} />
          Booking status
        </button>
        <button disabled={disabled} onClick={() => send('when is my next appointment?')}>
          <IconCalendar size={13} />
          Next appointment
        </button>
        <button disabled={disabled} onClick={() => send('can I get a refill on my BP med')}>
          <IconPill size={13} />
          Refill medication
        </button>
        <button disabled={disabled} onClick={() => send('what time do you close today?')}>
          <IconClock size={13} />
          Clinic hours
        </button>
        <button disabled={disabled} onClick={() => send('why do I owe this balance?')}>
          <IconDollar size={13} />
          My balance
        </button>
      </div>
      {showSlotPicker && (
        <div className="quick-actions-rail slot-picker">
          {slotOptions.length === 0 && <span className="empty-state">No open slots on file.</span>}
          {slotOptions.map((opt) => (
            <button key={opt.phrase} className="slot-option" disabled={disabled} onClick={() => send(opt.phrase)}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
