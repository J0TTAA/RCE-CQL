import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

interface AsyncOptions {
  refreshIntervalMs?: number;
  refreshOnFocus?: boolean;
}

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: AsyncOptions = {},
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const dataRef = useRef<T | null>(null);
  const previousDeps = useRef<unknown[] | null>(null);
  const lastRefreshAt = useRef(0);
  const requestPending = useRef(false);
  const requestId = useRef(0);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const currentRequestId = ++requestId.current;
    requestPending.current = true;
    const depsChanged =
      previousDeps.current === null ||
      deps.length !== previousDeps.current.length ||
      deps.some((dep, index) => dep !== previousDeps.current?.[index]);
    previousDeps.current = deps;
    if (depsChanged) {
      dataRef.current = null;
      setData(null);
    }
    setLoading(dataRef.current === null);
    setError(null);
    loader()
      .then((result) => {
        if (!cancelled) {
          dataRef.current = result;
          setData(result);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Ocurrió un error inesperado.');
        }
      })
      .finally(() => {
        if (requestId.current === currentRequestId) requestPending.current = false;
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (requestId.current === currentRequestId) requestPending.current = false;
    };
  }, [tick, ...deps]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (
        document.visibilityState !== 'visible' ||
        requestPending.current ||
        Date.now() - lastRefreshAt.current < 1000
      ) {
        return;
      }
      lastRefreshAt.current = Date.now();
      reload();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfVisible();
    };
    if (options.refreshOnFocus) {
      window.addEventListener('focus', refreshIfVisible);
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    const interval = options.refreshIntervalMs
      ? window.setInterval(refreshIfVisible, options.refreshIntervalMs)
      : null;
    return () => {
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (interval !== null) window.clearInterval(interval);
    };
  }, [options.refreshIntervalMs, options.refreshOnFocus, reload]);

  return { data, error, loading, reload };
}
