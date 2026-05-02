import { useState, useEffect, useCallback } from 'react';
import { Signal } from '../types';
import { fetchSignals, deleteSignal as apiDelete } from '../api/signals';

const REFRESH_INTERVAL = 15_000;

export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchSignals();
      setSignals(data);
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch signals';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  const remove = async (id: string) => {
    await apiDelete(id);
    setSignals((prev) => prev.filter((s) => s._id !== id));
  };

  return { signals, loading, error, lastRefreshed, refresh: load, remove };
}
