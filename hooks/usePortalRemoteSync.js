'use client';

import { useCallback, useEffect, useRef } from 'react';
import { portalRequest } from '@/lib/apiClient';
import {
  bookingSyncFingerprint,
  diffBookingSyncFingerprint,
} from '@/lib/syncFingerprints';
import { useVisibilityInterval } from '@/hooks/useVisibilityInterval';

/**
 * Polls the portal payload and applies remote updates when booking data changes.
 * While the client is editing/saving, soft-syncs related data without wiping form fields.
 */
export function usePortalRemoteSync({
  token,
  enabled = true,
  intervalMs = 3000,
  localFingerprint,
  dirty = false,
  saving = false,
  onRemoteUpdate,
}) {
  const inFlight = useRef(false);
  const dirtyRef = useRef(dirty);
  const savingRef = useRef(saving);
  const fingerprintRef = useRef(localFingerprint);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const lastToastAtRef = useRef(0);

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

  const check = useCallback(async () => {
    if (!token || inFlight.current) return;

    const known = fingerprintRef.current;
    if (known == null) return;

    const isBusy = dirtyRef.current || savingRef.current;
    inFlight.current = true;
    try {
      const result = await portalRequest(`/api/portal/${token}`);
      const remote = bookingSyncFingerprint({
        booking: result?.booking,
        files: result?.files,
        categoryStatuses: result?.categoryStatuses,
        schedule: result?.schedule,
        sites: result?.sites,
        permissions: result?.permissions,
        portal: result?.portal,
      });

      if (remote === known) return;

      const diff = diffBookingSyncFingerprint(known, remote);
      if (!diff.meaningful) {
        fingerprintRef.current = remote;
        return;
      }

      const now = Date.now();
      const allowToast = diff.meaningful && now - lastToastAtRef.current > 8000;

      await onRemoteUpdateRef.current?.(result, {
        softSync: isBusy,
        allowToast,
        ...diff,
      });

      fingerprintRef.current = remote;
      if (allowToast) lastToastAtRef.current = now;
    } catch {
      // Keep last good snapshot
    } finally {
      inFlight.current = false;
    }
  }, [token]);

  useVisibilityInterval(check, {
    enabled: Boolean(enabled && token),
    intervalMs,
  });
}

export default usePortalRemoteSync;
