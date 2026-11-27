import { useCallback, useEffect, useRef, useState } from 'react';

export interface ApiQueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function messageFrom(error: unknown): string {
  const axiosError = error as {
    response?: { data?: { error?: { message?: string }; detail?: string } };
    message?: string;
  };
  return (
    axiosError?.response?.data?.error?.message ||
    axiosError?.response?.data?.detail ||
    axiosError?.message ||
    'The ClassSphere API did not respond.'
  );
}

/**
 * Small data hook for console pages: one request per mount, an explicit loading
 * and error state, and a refetch for the retry affordance.
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {}
): ApiQueryState<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(messageFrom(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading, error, refetch };
}
