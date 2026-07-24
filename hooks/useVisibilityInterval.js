'use client';

import { useEffect, useRef } from 'react';

/**
 * Runs `callback` immediately and on an interval while the document is visible.
 * Behavior-preserving helper for live-sync / activity pollers.
 */
export function useVisibilityInterval(callback, { enabled = true, intervalMs = 3000 } = {}) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      callbackRef.current?.();
    };

    run();
    const timer = setInterval(run, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, intervalMs]);
}

export default useVisibilityInterval;
