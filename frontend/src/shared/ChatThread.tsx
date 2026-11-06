import { useEffect, useRef } from 'react';
import type { OpenSlot, ThreadMessage } from '../types';
import { TypingIndicator } from '../components/TypingIndicator';
import { QuickActions } from '../patient/QuickActions';

const SENDER_LABEL: Record<ThreadMessage['sender'], string> = {
  clinic: 'Clinic staff',
  patient: 'Alex',
  agent: 'Sapling agent',
};

export function ChatThread({
  messages,
  emptyHint,
  typing = false,
  openSlots,
  onQuickAction,
}: {
  messages: ThreadMessage[];
  emptyHint: string;
  /** Shows the animated "Thinking…" bubble while the agent's reply is pending. */
  typing?: boolean;
  /**
   * Both optional, and only meaningful together — when present, any
   * message flagged with `suggestActions` (the agent couldn't match it
   * to anything) renders the same quick-action buttons as the composer
   * right underneath it. Omit both to never show inline suggestions
   * (e.g. admin's read-only view of a patient's thread, or Voice Mode,
   * which deliberately shows no buttons at all).
   */
  openSlots?: OpenSlot[];
  onQuickAction?: (body: string) => void;
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
            {m.suggestActions && onQuickAction && (
              <div className="inline-suggestions">
                <QuickActions openSlots={openSlots ?? []} onSend={onQuickAction} />
              </div>
            )}
          </div>
        </div>
      ))}
      {typing && <TypingIndicator />}
    </div>
  );
}
