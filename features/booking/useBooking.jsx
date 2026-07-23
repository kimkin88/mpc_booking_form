'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';

/**
 * Feature hook: load and refresh a full booking aggregate.
 */
export function useBooking(bookingId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!bookingId) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get(`/api/bookings/${bookingId}`);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return { data, loading, error, refresh };
}
