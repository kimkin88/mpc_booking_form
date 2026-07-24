'use client';

import { useRef, useState } from 'react';
import styled from 'styled-components';
import { MAX_FILE_SIZE_MB } from '@/lib/constants';
import { formatFileSize } from '@/utils/format';
import { api } from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';
import { fileMeta, uploadToSignedSlot } from '@/lib/directUpload';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
  width: 100%;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.space[2]};
  align-items: start;
`;

const Addon = styled.div`
  display: flex;
  align-items: center;
  /* Match Input: label line-height + gap above the control */
  margin-top: calc(${({ theme }) => theme.fontSizes.sm} * 1.25 + ${({ theme }) => theme.space[1]});
`;

const PlusButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Match Input control: padding 0.55rem × 2 + line box + 1px borders */
  width: calc(1.1rem + 1.25em + 2px);
  height: calc(1.1rem + 1.25em + 2px);
  box-sizing: border-box;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1;
  transition:
    background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bgMuted};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.focus};
    outline-offset: 2px;
  }
`;

const FileList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const FileItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
  padding: 0.35rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const FileName = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`;

const Meta = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  flex-shrink: 0;
`;

const RemoveBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  padding: 0 0.15rem;
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.danger};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.danger};
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
`;

const CATEGORY = 'purchase_order_invoice';

async function resolveFileUrl(fileId, portalToken) {
  if (portalToken) {
    const res = await fetch(`/api/portal/${portalToken}/files?fileId=${fileId}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Could not load file');
    return json.data.url;
  }
  const data = await api.get(`/api/files/${fileId}`);
  return data.url;
}

/**
 * Compact PO uploader: + button aligned to the right of the PO Number field.
 * Pass `poNumberField` (the Input) to render input + button on one row.
 */
export function PoDocumentUploader({
  bookingId,
  files = [],
  onRefresh,
  readOnly = false,
  isAdmin = true,
  portalToken = null,
  poNumberField = null,
}) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const poFiles = (files || []).filter(
    (f) => f.category === CATEGORY && (!f.is_removed || isAdmin)
  );
  const visible = poFiles.filter((f) => !f.is_removed);

  const filesEndpoint = portalToken
    ? `/api/portal/${portalToken}/files`
    : `/api/bookings/${bookingId}/files`;

  const openFile = async (fileId) => {
    try {
      const url = await resolveFileUrl(fileId, portalToken);
      window.open(url, '_blank');
    } catch (err) {
      toast(err.message, { variant: 'error' });
    }
  };

  const upload = async (fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length || readOnly) return;

    setUploading(true);
    setError('');
    try {
      const prepared = portalToken
        ? await (async () => {
            const res = await fetch(filesEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'prepare',
                category: CATEGORY,
                files: list.map((f, index) => ({ ...fileMeta(f), clientId: String(index) })),
              }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.ok === false) {
              throw new Error(json.error || 'Could not prepare upload');
            }
            return json.data;
          })()
        : await api.post(filesEndpoint, {
            action: 'prepare',
            category: CATEGORY,
            files: list.map((f, index) => ({ ...fileMeta(f), clientId: String(index) })),
          });

      const slots = prepared.slots || [];
      const tickets = [];
      const earlyFailures = prepared.failures || [];

      for (let i = 0; i < slots.length; i += 1) {
        const slot = slots[i];
        const byId = slot.clientId != null ? list[Number(slot.clientId)] : undefined;
        const file = byId || list.find((f) => f.name === slot.filename) || list[i];
        if (!file) continue;
        await uploadToSignedSlot(slot, file);
        tickets.push(slot.ticket);
      }

      let results = [...earlyFailures];
      if (tickets.length) {
        const completed = portalToken
          ? await (async () => {
              const res = await fetch(filesEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'complete', tickets }),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || json.ok === false) {
                throw new Error(json.error || 'Could not finalize upload');
              }
              return json.data;
            })()
          : await api.post(filesEndpoint, { action: 'complete', tickets });
        results = results.concat(completed || []);
      }

      const failed = results.filter((r) => !r.success);
      if (failed.length) {
        setError(failed.map((f) => `${f.filename}: ${(f.errors || []).join(', ')}`).join('; '));
      } else {
        toast(list.length > 1 ? 'PO documents uploaded' : 'PO document uploaded');
      }
      await onRefresh?.();
    } catch (err) {
      setError(err.message || 'Upload failed');
      toast(err.message || 'Upload failed', { variant: 'error' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeFile = async (fileId) => {
    if (readOnly) return;
    try {
      if (portalToken) {
        const res = await fetch(filesEndpoint, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || 'Could not remove file');
        }
      } else {
        await api.delete(filesEndpoint, { fileId });
      }
      toast('PO document removed');
      await onRefresh?.();
    } catch (err) {
      toast(err.message, { variant: 'error' });
    }
  };

  const plusControl = !readOnly ? (
    <Addon>
      <HiddenInput
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => upload(e.target.files)}
      />
      <PlusButton
        type="button"
        disabled={uploading || !bookingId}
        onClick={() => inputRef.current?.click()}
        aria-label={uploading ? 'Uploading PO document' : 'Upload PO document'}
        title={uploading ? 'Uploading…' : `Upload PO document (max ${MAX_FILE_SIZE_MB}MB)`}
      >
        {uploading ? '…' : '+'}
      </PlusButton>
    </Addon>
  ) : null;

  return (
    <Wrap>
      {poNumberField ? (
        plusControl ? (
          <FieldRow>
            <div style={{ minWidth: 0 }}>{poNumberField}</div>
            {plusControl}
          </FieldRow>
        ) : (
          poNumberField
        )
      ) : (
        plusControl
      )}

      {visible.length > 0 && (
        <FileList>
          {visible.map((file) => (
            <FileItem key={file.id}>
              <FileName type="button" onClick={() => openFile(file.id)} title={file.original_filename}>
                {file.original_filename}
              </FileName>
              <Meta>{formatFileSize(file.file_size)}</Meta>
              {!readOnly && (
                <RemoveBtn
                  type="button"
                  aria-label={`Remove ${file.original_filename}`}
                  title="Remove"
                  onClick={() => removeFile(file.id)}
                >
                  ×
                </RemoveBtn>
              )}
            </FileItem>
          ))}
        </FileList>
      )}

      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Wrap>
  );
}
