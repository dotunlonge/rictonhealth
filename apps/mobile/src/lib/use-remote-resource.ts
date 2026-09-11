import { useCallback, useEffect, useState } from 'react';

export interface RemoteResource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload(): void;
}

export function useRemoteResource<T>(loader: () => Promise<T>): RemoteResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught: unknown) => {
        if (active)
          setError(
            caught instanceof Error ? caught.message : 'This information could not be loaded.'
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loader, requestKey]);

  const reload = useCallback(() => setRequestKey((key) => key + 1), []);
  return { data, error, loading, reload };
}
