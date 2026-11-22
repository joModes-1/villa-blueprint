'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api-client';
import { usePoll } from './use-poll';

export interface Resource<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

/** GET a path; reload on demand; optionally poll while `pollWhile` is true. */
export function useResource<T>(path: string | null, pollWhile = false): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);

  const reload = useCallback(async () => {
    if (path === null) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setLoading(path !== null);
    void reload();
  }, [path, reload]);

  usePoll(reload, pollWhile && path !== null);
  return { data, error, loading, reload };
}
