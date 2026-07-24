'use client';

import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/apiClient';
import {
  bookingSyncFingerprint,
  diffBookingSyncFingerprint,
} from '@/lib/syncFingerprints';

/**
 * Polls the full booking payload so admin sees portal (and other-tab) changes live.
 */
export function useBookingRemoteSync(
  bookingId,
  {
    enabled = true,
    intervalMs = 3000,
    localFingerprint,
    dirty = false,
    saving = false,
    onRemoteUpdate,
  } = {}
) {
  const inFlight = useRef(false);
  const dirtyRef = useRef(dirty);
  const savingRef = useRef(saving);
  const fingerprintRef = useRef(localFingerprint);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const lastToastAtRef = useRef(0);
  const primed = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    // Keep poll baseline aligned after local load/save, without forcing toasts.
    if (localFingerprint != null) {
      fingerprintRef.current = localFingerprint;
    }
  }, [localFingerprint]);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  const check = useCallback(async () => {
    if (!bookingId || inFlight.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    inFlight.current = true;
    try {
      const result = await api.get(`/api/bookings/${bookingId}`);
      const remote = bookingSyncFingerprint({
        booking: result?.booking,
        files: result?.files,
        categoryStatuses: result?.categoryStatuses,
        schedule: result?.schedule,
        sites: result?.sites,
        permissions: result?.permissions,
        portal: result?.portal,
      });

      if (!primed.current) {
        fingerprintRef.current = remote;
        primed.current = true;
        return;
      }

      const known = fingerprintRef.current;
      if (remote === known) return;

      const diff = diffBookingSyncFingerprint(known, remote);
      // Ignore non-meaningful fingerprint noise (unstable timestamps, etc.)
      if (!diff.meaningful) {
        fingerprintRef.current = remote;
        return;
      }

      const isBusy = dirtyRef.current || savingRef.current;
      const now = Date.now();
      const allowToast = diff.meaningful && now - lastToastAtRef.current > 8000;

      await onRemoteUpdateRef.current?.(result, {
        softSync: isBusy,
        allowToast,
        ...diff,
        remoteVersion: result?.booking?.current_version,
      });

      fingerprintRef.current = remote;
      if (allowToast) lastToastAtRef.current = now;
    } catch {
      // keep last good
    } finally {
      inFlight.current = false;
    }
  }, [bookingId]);

  useEffect(() => {
    primed.current = false;
  }, [bookingId]);

  useEffect(() => {
    if (!enabled || !bookingId) return undefined;

    let cancelled = false;
    const run = () => {
      if (!cancelled) check();
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
  }, [bookingId, enabled, intervalMs, check]);

  return { refresh: check };
}

export default useBookingRemoteSync;
