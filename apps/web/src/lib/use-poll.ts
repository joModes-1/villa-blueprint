'use client';

import { useEffect, useRef } from 'react';

/** Calls `load` every `ms` while `active`; never overlaps requests; stops on unmount. */
export function usePoll(load: () => Promise<void>, active: boolean, ms = 2000): void {
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let busy = false;
    const tick = async (): Promise<void> => {
      if (busy || stopped) return;
      busy = true;
      try {
        await loadRef.current();
      } catch {
        /* the next tick retries */
      } finally {
        busy = false;
      }
    };
    const id = setInterval(() => void tick(), ms);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [active, ms]);
}
