'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';

const CLIENT_RECENT_ACTIONS = new Set([
  'field_updated',
  'file_uploaded',
  'file_replaced',
  'file_removed',
  'file_status_changed',
  'schedule_entry_added',
  'schedule_entry_updated',
  'schedule_entry_removed',
  'site_entry_added',
  'site_entry_updated',
  'site_entry_removed',
  'status_changed',
  'booking_submitted',
]);

function activityKey(items = []) {
  return items.map((row) => row.id).join(',');
}

function filterForRole(entries, role) {
  const list = Array.isArray(entries) ? entries : [];
  if (role === 'client') {
    return list.filter(
      (row) => row.actor_role === 'client' && CLIENT_RECENT_ACTIONS.has(row.action)
    );
  }
  if (role === 'admin') {
    return list.filter((row) => row.actor_role === 'admin');
  }
  return list;
}

/**
 * Polls booking activity for Recent updates.
 * `role`: client | admin | all
 * `onClientActivity` runs when new client activity appears (for live booking sync).
 */
export function useRecentClientUpdates(
  bookingId,
  { intervalMs = 5000, enabled = true, role = 'client', onClientActivity } = {}
) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);
  const clientKeyRef = useRef(null);
  const onClientActivityRef = useRef(onClientActivity);
  const roleRef = useRef(role);

  useEffect(() => {
    onClientActivityRef.current = onClientActivity;
  }, [onClientActivity]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const refresh = useCallback(async () => {
    if (!bookingId || inFlight.current) return;
    inFlight.current = true;
    try {
      // Always load a mixed window so we can sync on client activity
      // regardless of the selected filter.
      const entries = await api.get(`/api/bookings/${bookingId}/activity?role=all&limit=80`);
      const list = Array.isArray(entries) ? entries : [];
      const display = filterForRole(list, roleRef.current);
      setItems(display);

      const clientItems = filterForRole(list, 'client');
      const nextKey = activityKey(clientItems);
      if (clientKeyRef.current === null) {
        clientKeyRef.current = nextKey;
      } else if (nextKey !== clientKeyRef.current) {
        clientKeyRef.current = nextKey;
        await onClientActivityRef.current?.();
      }
    } catch {
      // Keep last good snapshot; avoid noisy toasts on background polls.
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!enabled || !bookingId) return undefined;

    let cancelled = false;
    const run = () => {
      if (!cancelled && document.visibilityState !== 'hidden') {
        refresh();
      }
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
  }, [bookingId, enabled, intervalMs, refresh]);

  // Re-filter immediately when the admin switches tabs (without waiting for poll).
  useEffect(() => {
    if (!enabled || !bookingId) return;
    refresh();
  }, [role, bookingId, enabled, refresh]);

  return { items, loading, refresh };
}

export default useRecentClientUpdates;
