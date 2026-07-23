'use client';

/**
 * Clients access the portal via their unique URL token only — no login or session.
 * This hook is kept for compatibility; it simply loads portal data from the token in the URL.
 */
import { useCallback, useEffect, useState } from 'react';
import { portalRequest } from '@/lib/apiClient';

export function usePortalSession(token) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await portalRequest(`/api/portal/${token}`);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return { data, loading, error, refresh };
}
