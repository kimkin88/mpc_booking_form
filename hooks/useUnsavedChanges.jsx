'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks dirty form state and warns before unload.
 */
export function useUnsavedChanges(isDirty) {
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}

/**
 * Generic async fetch helper hook.
 */
export function useAsync(asyncFn, immediate = false) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: immediate,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await asyncFn(...args);
        if (mounted.current) setState({ data, error: null, loading: false });
        return data;
      } catch (error) {
        if (mounted.current) setState({ data: null, error, loading: false });
        throw error;
      }
    },
    [asyncFn]
  );

  useEffect(() => {
    if (immediate) execute();
  }, [immediate, execute]);

  return { ...state, execute };
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
