import { useOfflineMode } from '../shared/useOfflineMode';
import { ToggleSwitch } from './ToggleSwitch';

/**
 * Forces every conversation onto the deterministic rule-based agent,
 * global and persisted server-side — either role can flip it, and both
 * see the same state. Mainly useful on the patient side: it's the
 * concrete, on-demand proof that the whole thing still works with no
 * hosted model and no API key, without anyone touching the server.
 */
export function OfflineModeToggle({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const { forced, llmConfigured, loading, setForced } = useOfflineMode();

  if (loading) return null;

  return (
    <div className={`offline-toggle${theme === 'dark' ? ' dark' : ''}`}>
      <ToggleSwitch checked={forced} onChange={setForced} label="Try offline mode" />
      <div className="offline-toggle-hint">
        {forced
          ? 'Using the built-in rule-based agent, no AI model.'
          : llmConfigured
            ? 'Currently using the AI model.'
            : 'No AI model configured — already running offline.'}
      </div>
    </div>
  );
}
