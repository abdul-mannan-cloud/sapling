import { useState, type ReactNode } from 'react';
import { IconArrowUp } from '../components/Icons';

export function Composer({
  placeholder,
  disabled,
  onSend,
  extra,
  hintExtra,
}: {
  placeholder: string;
  disabled?: boolean;
  onSend: (body: string) => void;
  /** Extra control rendered inside the input pill, before the send button — e.g. the voice MicButton (patient view only). */
  extra?: ReactNode;
  /** Extra control rendered on the hint row, right-aligned opposite "Enter to send…" — e.g. the "Play audio on reply" switch. */
  hintExtra?: ReactNode;
}) {
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    if (!draft.trim() || disabled) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <div className="composer">
      <div className="composer-box">
        <textarea
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        {extra}
        <button className="send-btn" onClick={handleSend} disabled={disabled || !draft.trim()} aria-label="Send message">
          <IconArrowUp size={16} />
        </button>
      </div>
      <div className="composer-hint-row">
        <span className="composer-hint">Enter to send · Shift+Enter for a new line</span>
        {hintExtra}
      </div>
    </div>
  );
}
