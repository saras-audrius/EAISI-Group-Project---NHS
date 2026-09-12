import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * One fetch, with the three states every fetch in this app has to have.
 *
 * It exists because the previous code had a `.finally()` without a `.catch()`:
 * a failed explanation request left the chart area empty with no message, and an
 * empty chart in a clinical UI reads as "no contributing factors" rather than
 * "this did not load". Making the error path structural rather than optional is
 * the fix; every caller now has to render `error` to compile sensibly.
 *
 * `reload` lets the error state offer a retry instead of asking for a refresh,
 * which would lose the clinician's half-written rationale.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // The dependency list is the caller's, plus the retry nonce. It is passed
  // through deliberately rather than closed over, so a route change refetches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, [...deps, nonce]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    run()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [run]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}
