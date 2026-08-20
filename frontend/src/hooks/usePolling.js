/**
 * usePolling — runs `fetchFn` immediately, then every `intervalMs` milliseconds.
 *
 * Returns { data, loading, error }.
 * Note: this is intentional frontend-only UI refresh — it is NOT the same as
 * the retired backend warehouse-polling approach. The backend receives webhook
 * pushes; this hook simply keeps the UI in sync with the backend's latest data.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export function usePolling(fetchFn, intervalMs = 12000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const savedFn = useRef(fetchFn);

  // Keep the ref fresh without restarting the interval
  useEffect(() => {
    savedFn.current = fetchFn;
  }, [fetchFn]);

  const run = useCallback(async () => {
    try {
      const result = await savedFn.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [run, intervalMs]);

  return { data, loading, error };
}
