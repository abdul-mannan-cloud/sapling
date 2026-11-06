import { useEffect, useRef } from 'react';
import type { ThreadMessage } from '../types';

const SENDER_LABEL: Record<ThreadMessage['sender'], string> = {
  clinic: 'Clinic (staff)',
  patient: 'Alex',
  agent: 'Agent',
};

export function ChatThread({ messages, emptyHint }: { messages: ThreadMessage[]; emptyHint: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-scroll" ref={scrollRef}>
      {messages.length === 0 && <div className="empty-state">{emptyHint}</div>}
      {messages.map((m) => (
        <div key={m.id} className={`bubble-row ${m.sender}`}>
          <div className={`bubble ${m.sender}`}>
            <span className="meta">
              {SENDER_LABEL[m.sender]} · {new Date(m.createdAt).toLocaleTimeString()}
            </span>
            {m.body}
          </div>
        </div>
      ))}
    </div>
  );
}
