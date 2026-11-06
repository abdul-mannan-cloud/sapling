import { useState } from 'react';

export function Composer({
  placeholder,
  disabled,
  onSend,
}: {
  placeholder: string;
  disabled?: boolean;
  onSend: (body: string) => void;
}) {
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    if (!draft.trim() || disabled) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <div className="composer">
      <div className="composer-row">
        <textarea
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button onClick={handleSend} disabled={disabled}>
          Send
        </button>
      </div>
    </div>
  );
}
