import { useEffect, useState } from 'react';
import { api } from '../api';

/**
 * A global, server-persisted switch — not per-session — so either role
 * can flip it from their own sidebar and the other side sees the same
 * state. Forcing it on routes every conversation to the deterministic
 * rule-based agent regardless of whether an API key is configured,
 * which is what actually demonstrates the offline path on demand.
 */
export function useOfflineMode() {
  const [forced, setForcedState] = useState(false);
  const [llmConfigured, setLlmConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getOfflineMode()
      .then((r) => {
        setForcedState(r.forced);
        setLlmConfigured(r.llmConfigured);
      })
      .finally(() => setLoading(false));
  }, []);

  const setForced = async (next: boolean) => {
    const r = await api.setOfflineMode(next);
    setForcedState(r.forced);
    setLlmConfigured(r.llmConfigured);
  };

  return { forced, llmConfigured, loading, setForced };
}
