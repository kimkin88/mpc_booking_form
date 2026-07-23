'use client';

import { useCallback, useEffect, useRef } from 'react';
import { portalRequest } from '@/lib/apiClient';

export function filesFingerprint(files = [], categoryStatuses = []) {
  const filePart = (files || [])
    .map(
      (f) =>
        `${f.id}:${f.version ?? ''}:${f.status ?? ''}:${f.is_removed ? 1 : 0}:${f.file_size ?? ''}:${f.created_at ?? ''}:${f.storage_key ?? ''}`
    )
    .sort()
    .join('|');
  const statusPart = (categoryStatuses || [])
    .map((s) => `${s.category}:${s.status}:${s.updated_at || ''}`)
    .sort()
    .join('|');
  return `${filePart}#${statusPart}`;
}

/**
 * Polls the portal payload and applies remote updates when booking
 * `current_version` or files change. While the client is editing, still soft-syncs
 * files / status / editability without overwriting form fields.
 */
export function usePortalRemoteSync({
  token,
  enabled = true,
  intervalMs = 4000,
  localVersion,
  localFilesKey,
  dirty = false,
  saving = false,
  onRemoteUpdate,
}) {
  const inFlight = useRef(false);
  const dirtyRef = useRef(dirty);
  const savingRef = useRef(saving);
  const versionRef = useRef(localVersion);
  const filesKeyRef = useRef(localFilesKey);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    versionRef.current = localVersion;
  }, [localVersion]);

  useEffect(() => {
    filesKeyRef.current = localFilesKey;
  }, [localFilesKey]);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
  }, [onRemoteUpdate]);

  const check = useCallback(async () => {
    if (!token || inFlight.current) return;
    if (document.visibilityState === 'hidden') return;

    const knownVersion = versionRef.current;
    const knownFilesKey = filesKeyRef.current;
    if (knownVersion == null) return;

    const isBusy = dirtyRef.current || savingRef.current;

    inFlight.current = true;
    try {
      const result = await portalRequest(`/api/portal/${token}`);
      const remoteVersion = result?.booking?.current_version;
      const remoteFilesKey = filesFingerprint(result?.files, result?.categoryStatuses);

      const versionChanged = remoteVersion != null && remoteVersion !== knownVersion;
      const filesChanged = remoteFilesKey !== knownFilesKey;

      if (!versionChanged && !filesChanged) return;

      if (isBusy) {
        await onRemoteUpdateRef.current?.(result, {
          softSync: true,
          versionChanged: false,
          filesChanged,
        });
        if (filesChanged) filesKeyRef.current = remoteFilesKey;
        return;
      }

      await onRemoteUpdateRef.current?.(result, {
        softSync: false,
        versionChanged,
        filesChanged,
      });

      if (versionChanged && remoteVersion != null) {
        versionRef.current = remoteVersion;
      }
      if (filesChanged) {
        filesKeyRef.current = remoteFilesKey;
      }
    } catch {
      // Keep last good snapshot; avoid noisy toasts on background polls.
    } finally {
      inFlight.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (!enabled || !token) return undefined;

    let cancelled = false;
    const run = () => {
      if (!cancelled) check();
    };

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
  }, [token, enabled, intervalMs, check]);
}

export default usePortalRemoteSync;
