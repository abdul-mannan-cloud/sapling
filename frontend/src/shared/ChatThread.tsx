import { useEffect, useRef } from 'react';
import type { ThreadMessage } from '../types';
import { TypingIndicator } from '../components/TypingIndicator';

const SENDER_LABEL: Record<ThreadMessage['sender'], string> = {
  clinic: 'Clinic staff',
  patient: 'Alex',
  agent: 'Sapling agent',
};

export function ChatThread({
  messages,
  emptyHint,
  typing = false,
}: {
  messages: ThreadMessage[];
  emptyHint: string;
  /** Shows the animated "Thinking…" bubble while the agent's reply is pending. */
  typing?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  return (
    <div className="chat-scroll" ref={scrollRef}>
      {messages.length === 0 && !typing && <div className="empty-state">{emptyHint}</div>}
      {messages.map((m) => (
        <div key={m.id} className={`bubble-row ${m.sender}`}>
          <div className="bubble-block">
            <div className="bubble-meta">
              <span className="sender-dot" aria-hidden="true" />
              {SENDER_LABEL[m.sender]} · {new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
            <div className={`bubble ${m.sender}`}>{m.body}</div>
          </div>
        </div>
      ))}
      {typing && <TypingIndicator />}
    </div>
  );
}
