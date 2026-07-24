'use client';

import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/apiClient';
import {
  bookingSyncFingerprint,
  diffBookingSyncFingerprint,
} from '@/lib/syncFingerprints';
import { useVisibilityInterval } from '@/hooks/useVisibilityInterval';

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
    if (localFingerprint != null) {
      fingerprintRef.current = localFingerprint;
    }
  }, [localFingerprint]);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  useEffect(() => {
    primed.current = false;
  }, [bookingId]);

  const check = useCallback(async () => {
    if (!bookingId || inFlight.current) return;

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

  useVisibilityInterval(check, {
    enabled: Boolean(enabled && bookingId),
    intervalMs,
  });

  return { refresh: check };
}

export default useBookingRemoteSync;
