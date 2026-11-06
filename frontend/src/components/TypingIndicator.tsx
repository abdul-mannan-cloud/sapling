import { SaplingMark } from './Logo';

/**
 * Shown while the agent's reply is pending. No bubble chrome, no label —
 * just the sapling mark itself, left-aligned like an incoming agent
 * message, growing and settling on a staggered loop.
 */
export function TypingIndicator() {
  return (
    <div className="bubble-row agent">
      <span className="typing-mark" aria-hidden="true">
        <SaplingMark size={28} />
      </span>
    </div>
  );
}
