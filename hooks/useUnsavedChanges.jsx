'use client';

import { useEffect, useState } from 'react';

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

/** Debounces a value; used by search inputs (admin list, activity log, links). */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default useUnsavedChanges;
