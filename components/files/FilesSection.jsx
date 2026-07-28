'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, EmptyState, Spinner } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Dialog';
import { Section, SectionTitle, SectionHint, Row } from '@/components/layout/PageHeader';
import {
  ALLOWED_EXTENSIONS_LABEL,
  FILE_CATEGORIES,
  FILE_STATUSES,
  MAX_FILE_SIZE_MB,
} from '@/lib/constants';
import { formatDateTime, formatFileSize } from '@/utils/format';
import { api } from '@/lib/apiClient';
import { useToast } from '@/components/ui/Toast';
import { ChevronIcon } from '@/components/ui/ActionsMenu';
import { fileMeta, uploadToSignedSlot } from '@/lib/directUpload';

const DropZone = styled.div`
  border: 2px dashed
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.borderStrong)};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryMuted : theme.colors.bgMuted};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[8]};
  text-align: center;
  transition:
    background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};
  cursor: pointer;
`;

const CategoryBlock = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.colors.surface};
`;

const CategoryToolbar = styled.div`
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: ${({ theme }) => theme.space[2]};
  flex-shrink: 0;

  > div {
    width: auto;
    min-width: 10.5rem;
  }

  button {
    box-sizing: border-box;
    min-height: 2.5rem;
    height: 2.5rem;
    padding-top: 0;
    padding-bottom: 0;
  }
`;

const FileRow = styled.div`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.space[3]};
  align-items: center;
  padding: ${({ theme }) => theme.space[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 640px) {
    grid-template-columns: 56px minmax(0, 1fr);
  }
`;

const FileInfo = styled.div`
  min-width: 0;
  overflow: hidden;
`;

const FileNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
`;

const FileName = styled.span`
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileBadges = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
`;

const FileMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileCount = styled.span`
  margin-left: 0.5rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const UploadError = styled.div`
  margin-top: 0.75rem;
  color: ${({ theme }) => theme.colors.danger};
`;

const ActionsCell = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;

  @media (max-width: 640px) {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
`;

const ThumbButton = styled.button`
  width: 72px;
  height: 72px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bgMuted};
  overflow: hidden;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  @media (max-width: 640px) {
    width: 56px;
    height: 56px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryMuted};
    border-color: ${({ theme }) => theme.colors.focus};
  }
`;

const FileTypeBadge = styled.span`
  font-size: 0.65rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: 0.25rem;
  text-align: center;
  line-height: 1.2;
`;

const PendingStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  margin-top: ${({ theme }) => theme.space[3]};
`;

const PendingThumb = styled.div`
  width: 88px;
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgMuted};

  img {
    width: 88px;
    height: 72px;
    object-fit: cover;
    display: block;
  }

  figcaption {
    margin: 0;
    padding: 0.25rem 0.35rem;
    font-size: 0.65rem;
    color: ${({ theme }) => theme.colors.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const PreviewFrame = styled.div`
  background: ${({ theme }) => theme.colors.bgMuted};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.space[3]};
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;

  img {
    max-width: 100%;
    max-height: min(70vh, 640px);
    object-fit: contain;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`;

const Progress = styled.div`
  height: 6px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  overflow: hidden;
  margin-top: ${({ theme }) => theme.space[2]};

  > div {
    height: 100%;
    width: ${({ $value }) => `${$value}%`};
    background: ${({ theme }) => theme.colors.primary};
    transition: width 120ms ease;
  }
`;

const MenuContent = styled(DropdownMenu.Content)`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
  padding: ${({ theme }) => theme.space[1]};
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  min-width: 160px;
`;

const MenuItem = styled(DropdownMenu.Item)`
  padding: 0.5rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  outline: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &[data-highlighted] {
    background: ${({ theme }) => theme.colors.primaryMuted};
  }

  &[data-disabled] {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

function statusTone(status) {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'missing') return 'danger';
  if (status === 'under_review' || status === 'requested') return 'warning';
  if (status === 'uploaded') return 'info';
  return 'neutral';
}

function isImageMime(mime) {
  return !!mime?.startsWith('image/');
}

function fileExtLabel(filename = '', mime = '') {
  const fromName = filename.includes('.') ? filename.split('.').pop() : '';
  if (fromName) return fromName.slice(0, 5);
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z')) return 'zip';
  if (mime.includes('sheet') || mime.includes('excel')) return 'xls';
  if (mime.includes('word')) return 'doc';
  return 'file';
}

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

function FileThumb({ file, portalToken, onPreview }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const image = isImageMime(file.mime_type);

  useEffect(() => {
    if (!image) return undefined;
    let cancelled = false;
    setFailed(false);
    setUrl(null);
    resolveFileUrl(file.id, portalToken)
      .then((next) => {
        if (!cancelled) setUrl(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file.id, file.mime_type, image, portalToken]);

  if (!image) {
    return (
      <ThumbButton type="button" $clickable={false} aria-hidden tabIndex={-1}>
        <FileTypeBadge>{fileExtLabel(file.original_filename, file.mime_type)}</FileTypeBadge>
      </ThumbButton>
    );
  }

  return (
    <ThumbButton
      type="button"
      $clickable
      aria-label={`Preview ${file.original_filename}`}
      onClick={() => {
        if (url) onPreview({ url, name: file.original_filename, mime: file.mime_type });
      }}
      disabled={!url && !failed}
    >
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" onError={() => setFailed(true)} />
      ) : failed ? (
        <FileTypeBadge>img</FileTypeBadge>
      ) : (
        <Spinner aria-label="Loading preview" />
      )}
    </ThumbButton>
  );
}

function clientCanMutateFile(file) {
  if (!file || file.is_removed) return false;
  if (file.uploaded_via && file.uploaded_via !== 'client_portal') return false;
  if (file.status === 'under_review' || file.status === 'approved') return false;
  return true;
}

function mutateBlockedReason(file) {
  if (file?.status === 'under_review') {
    return 'This file is under review and cannot be changed';
  }
  if (file?.status === 'approved') {
    return 'This file is approved and cannot be changed';
  }
  if (file?.uploaded_via && file.uploaded_via !== 'client_portal') {
    return 'You can only change files you uploaded';
  }
  return 'This file cannot be changed';
}

export function FilesSection({
  bookingId,
  files = [],
  categoryStatuses = [],
  onRefresh,
  readOnly = false,
  isAdmin = true,
  portalToken = null,
  id,
  categories = FILE_CATEGORIES,
  title = 'Files & Assets',
  hint = null,
  hideChrome = false,
  onUseExistingDocs = null,
  onImport = null,
}) {
  const { toast } = useToast();
  const inputRefs = useRef({});
  const categoryList = categories?.length ? categories : FILE_CATEGORIES;
  const [dragCategory, setDragCategory] = useState(null);
  const [uploadingCategory, setUploadingCategory] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState([]);
  const [descriptions, setDescriptions] = useState({});
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [preview, setPreview] = useState(null);
  const [pendingPreviews, setPendingPreviews] = useState([]);

  const statusFor = (category) =>
    categoryStatuses.find((c) => c.category === category)?.status || 'missing';

  const filesFor = (category) =>
    files.filter((f) => f.category === category && (!f.is_removed || isAdmin));

  const downloadFile = async (fileId) => {
    const url = await resolveFileUrl(fileId, portalToken);
    window.open(url, '_blank');
  };

  const openPreview = async (file) => {
    if (!isImageMime(file.mime_type)) {
      await downloadFile(file.id);
      return;
    }
    try {
      const url = await resolveFileUrl(file.id, portalToken);
      setPreview({ url, name: file.original_filename, mime: file.mime_type });
    } catch (err) {
      setErrors([err.message]);
    }
  };

  const clearPendingPreviews = useCallback(() => {
    setPendingPreviews((prev) => {
      prev.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
      return [];
    });
  }, []);

  useEffect(() => () => clearPendingPreviews(), [clearPendingPreviews]);

  const upload = useCallback(
    async (category, fileList) => {
      const list = Array.from(fileList || []);
      if (!list.length) return;

      clearPendingPreviews();
      setUploadingCategory(category);
      setPendingPreviews(
        list
          .filter((f) => isImageMime(f.type))
          .map((f) => ({
            id: `${f.name}-${f.size}-${f.lastModified}`,
            name: f.name,
            url: URL.createObjectURL(f),
          }))
      );

      setUploading(true);
      setProgress(5);
      setErrors([]);

      try {
        const filesEndpoint = portalToken
          ? `/api/portal/${portalToken}/files`
          : `/api/bookings/${bookingId}/files`;

        const prepared = portalToken
          ? await (async () => {
              const res = await fetch(filesEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'prepare',
                  category,
                  description: descriptions[category] || null,
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
              category,
              description: descriptions[category] || null,
              files: list.map((f, index) => ({ ...fileMeta(f), clientId: String(index) })),
            });

        const slots = prepared.slots || [];
        const earlyFailures = prepared.failures || [];
        const tickets = [];

        for (let i = 0; i < slots.length; i += 1) {
          const slot = slots[i];
          const byId = slot.clientId != null ? list[Number(slot.clientId)] : undefined;
          const file = byId || list.find((f) => f.name === slot.filename) || list[i];
          if (!file) {
            earlyFailures.push({
              success: false,
              filename: slot.filename,
              errors: ['Matching file missing'],
            });
            continue;
          }
          await uploadToSignedSlot(slot, file);
          tickets.push(slot.ticket);
          setProgress(10 + Math.round(((i + 1) / Math.max(slots.length, 1)) * 70));
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

        setProgress(100);
        const failed = results.filter((r) => !r.success);
        if (failed.length) {
          setErrors(failed.map((f) => `${f.filename}: ${(f.errors || []).join(', ')}`));
        } else if (slots.length || earlyFailures.length === 0) {
          toast('Files uploaded');
        }
        setDescriptions((prev) => ({ ...prev, [category]: '' }));
        await onRefresh?.();
      } catch (err) {
        setErrors([err.message]);
      } finally {
        setUploading(false);
        setUploadingCategory(null);
        clearPendingPreviews();
        setTimeout(() => setProgress(0), 600);
      }
    },
    [bookingId, clearPendingPreviews, descriptions, onRefresh, portalToken, toast]
  );

  const onDrop = (category, e) => {
    e.preventDefault();
    setDragCategory(null);
    if (readOnly) return;
    upload(category, e.dataTransfer.files);
  };

  const removeFile = async (file) => {
    const fileId = typeof file === 'string' ? file : file?.id;
    if (!isAdmin && !clientCanMutateFile(file)) {
      const message = mutateBlockedReason(file);
      setErrors([message]);
      toast(message, { variant: 'error' });
      return;
    }

    try {
      if (portalToken) {
        const res = await fetch(`/api/portal/${portalToken}/files`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || 'Could not remove file');
        }
      } else {
        await api.delete(`/api/bookings/${bookingId}/files`, { fileId });
      }
      toast('File removed');
      await onRefresh?.();
    } catch (err) {
      const message = err.message || 'Could not remove file';
      setErrors([message]);
      toast(message, { variant: 'error' });
    }
  };

  const restoreFile = async (fileId) => {
    try {
      await api.patch(`/api/bookings/${bookingId}/files`, {
        action: 'restore',
        fileId,
      });
      await onRefresh?.();
    } catch (err) {
      toast(err.message || 'Could not restore file', { variant: 'error' });
    }
  };

  const changeCategoryStatus = async (category, status) => {
    await api.patch(`/api/bookings/${bookingId}/files`, {
      action: 'category_status',
      category,
      status,
    });
    await onRefresh?.();
  };

  const changeFileStatus = async (fileId, status) => {
    await api.patch(`/api/bookings/${bookingId}/files`, {
      action: 'update',
      fileId,
      updates: { status },
    });
    await onRefresh?.();
  };

  const viewVersions = async (fileId) => {
    const data = await api.get(`/api/files/${fileId}?mode=versions`);
    setVersions(data);
    setVersionsOpen(true);
  };

  const replaceFile = async (fileId, file, meta) => {
    if (!isAdmin && meta && !clientCanMutateFile(meta)) {
      const message = mutateBlockedReason(meta);
      setErrors([message]);
      toast(message, { variant: 'error' });
      return;
    }

    try {
      const filesEndpoint = portalToken
        ? `/api/portal/${portalToken}/files`
        : `/api/bookings/${bookingId}/files`;

      const slot = portalToken
        ? await (async () => {
            const res = await fetch(filesEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'prepare_replace',
                fileId,
                file: fileMeta(file),
              }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.ok === false) {
              throw new Error(json.error || 'Could not prepare replace');
            }
            return json.data;
          })()
        : await api.post(filesEndpoint, {
            action: 'prepare_replace',
            fileId,
            file: fileMeta(file),
          });

      await uploadToSignedSlot(slot, file);

      if (portalToken) {
        const res = await fetch(filesEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete_replace', ticket: slot.ticket }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || 'Could not replace file');
        }
      } else {
        await api.post(filesEndpoint, {
          action: 'complete_replace',
          ticket: slot.ticket,
        });
      }

      toast('File replaced');
      await onRefresh?.();
    } catch (err) {
      const message = err.message || 'Could not replace file';
      setErrors([message]);
      toast(message, { variant: 'error' });
    }
  };

  return (
    <Section id={id}>
      {!hideChrome && <SectionTitle>{title}</SectionTitle>}
      {!hideChrome && (
        <SectionHint>
          {hint ||
            `Multiple files per category. Maximum file size: ${MAX_FILE_SIZE_MB}MB per file. Supported: ${ALLOWED_EXTENSIONS_LABEL}. Images show a thumbnail — click to enlarge.`}
        </SectionHint>
      )}

      {errors.length > 0 && (
        <UploadError role="alert">
          {errors.map((err) => (
            <p key={err} style={{ margin: '0.25rem 0' }}>
              {err}
            </p>
          ))}
        </UploadError>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        {categoryList.map((cat) => {
          const catFiles = filesFor(cat.value);
          const status = statusFor(cat.value);
          return (
            <CategoryBlock key={cat.value}>
              <Row
                style={{ justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.75rem' }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{cat.label}</strong>
                  <div style={{ marginTop: '0.35rem' }}>
                    <Badge $tone={statusTone(status)}>
                      {FILE_STATUSES.find((s) => s.value === status)?.label || status}
                    </Badge>
                    <FileCount>{catFiles.filter((f) => !f.is_removed).length} file(s)</FileCount>
                  </div>
                </div>
                <CategoryToolbar>
                  {isAdmin && (
                    <Select
                      label=""
                      value={status}
                      onValueChange={(v) => changeCategoryStatus(cat.value, v)}
                      options={FILE_STATUSES}
                      fullWidth={false}
                    />
                  )}
                  {isAdmin &&
                    cat.value === 'media_plan' &&
                    (typeof onImport === 'function' || typeof onUseExistingDocs === 'function') && (
                      <DropdownMenu.Root modal={false}>
                        <DropdownMenu.Trigger asChild>
                          <Button variant="secondary" type="button" style={{ fontWeight: 400 }}>
                            Options
                            <ChevronIcon />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <MenuContent align="end" sideOffset={4}>
                            {typeof onImport === 'function' && (
                              <MenuItem
                                onSelect={() =>
                                  onImport(
                                    catFiles.filter((f) => !f.is_removed),
                                    cat.value
                                  )
                                }
                              >
                                Import new file to parse data
                              </MenuItem>
                            )}
                            {typeof onUseExistingDocs === 'function' && (
                              <MenuItem
                                disabled={!catFiles.some((f) => !f.is_removed)}
                                onSelect={() => {
                                  if (!catFiles.some((f) => !f.is_removed)) return;
                                  onUseExistingDocs(
                                    catFiles.filter((f) => !f.is_removed),
                                    cat.value
                                  );
                                }}
                              >
                                Parse existing files data
                              </MenuItem>
                            )}
                          </MenuContent>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    )}
                </CategoryToolbar>
              </Row>

              {!readOnly && (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <Input
                      label={`${cat.label} description (optional)`}
                      value={descriptions[cat.value] || ''}
                      onChange={(e) =>
                        setDescriptions((prev) => ({ ...prev, [cat.value]: e.target.value }))
                      }
                    />
                  </div>
                  <DropZone
                    $active={dragCategory === cat.value}
                    role="button"
                    tabIndex={0}
                    aria-label={`Upload ${cat.label} files — drag and drop or click. Maximum ${MAX_FILE_SIZE_MB} megabytes per file`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragCategory(cat.value);
                    }}
                    onDragLeave={() => setDragCategory(null)}
                    onDrop={(e) => onDrop(cat.value, e)}
                    onClick={() => inputRefs.current[cat.value]?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') inputRefs.current[cat.value]?.click();
                    }}
                    style={{ marginBottom: '1rem' }}
                  >
                    <input
                      ref={(el) => {
                        inputRefs.current[cat.value] = el;
                      }}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
                      hidden
                      onChange={(e) => {
                        upload(cat.value, e.target.files);
                        e.target.value = '';
                      }}
                    />
                    {uploading && uploadingCategory === cat.value ? (
                      <>
                        <Spinner aria-label="Uploading" />
                        <p>Uploading…</p>
                        <Progress
                          $value={progress}
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div />
                        </Progress>
                      </>
                    ) : (
                      <>
                        <p style={{ margin: 0, fontWeight: 600 }}>Upload to {cat.label}</p>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
                          Drag & drop files here or click to browse
                        </p>
                        <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', opacity: 0.85 }}>
                          Max {MAX_FILE_SIZE_MB}MB per file
                        </p>
                      </>
                    )}
                  </DropZone>

                  {pendingPreviews.length > 0 && uploadingCategory === cat.value && (
                    <PendingStrip aria-label="Images being uploaded">
                      {pendingPreviews.map((p) => (
                        <PendingThumb key={p.id} as="figure">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="" />
                          <figcaption title={p.name}>{p.name}</figcaption>
                        </PendingThumb>
                      ))}
                    </PendingStrip>
                  )}
                </>
              )}

              {catFiles.length === 0 && (
                <EmptyState style={{ padding: '1rem' }}>No files in this category</EmptyState>
              )}

              {catFiles.map((file) => (
                <FileRow key={file.id}>
                  <FileThumb file={file} portalToken={portalToken} onPreview={setPreview} />
                  <FileInfo>
                    <FileNameRow>
                      <FileName title={file.original_filename}>{file.original_filename}</FileName>
                      <FileBadges>
                        {file.is_removed && <Badge $tone="danger">Removed</Badge>}
                        <Badge $tone="info">v{file.version}</Badge>
                      </FileBadges>
                    </FileNameRow>
                    <FileMeta>
                      {file.mime_type} · {formatFileSize(file.file_size)} ·{' '}
                      {file.uploaded_by_name || 'Unknown'} · {formatDateTime(file.created_at)}
                      {file.description ? ` · ${file.description}` : ''}
                    </FileMeta>
                  </FileInfo>
                  <ActionsCell>
                    {isImageMime(file.mime_type) && (
                      <Button variant="secondary" size="sm" onClick={() => openPreview(file)}>
                        Preview
                      </Button>
                    )}
                    <DropdownMenu.Root modal={false}>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="secondary" size="sm">
                          Actions
                          <ChevronIcon />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <MenuContent align="end" sideOffset={4}>
                          <MenuItem onSelect={() => downloadFile(file.id)}>Download</MenuItem>
                          {isImageMime(file.mime_type) && (
                            <MenuItem onSelect={() => openPreview(file)}>Preview</MenuItem>
                          )}
                          {isAdmin && (
                            <>
                              <MenuItem onSelect={() => viewVersions(file.id)}>
                                View Versions
                              </MenuItem>
                              {FILE_STATUSES.map((s) => (
                                <MenuItem
                                  key={s.value}
                                  onSelect={() => changeFileStatus(file.id, s.value)}
                                >
                                  Status: {s.label}
                                </MenuItem>
                              ))}
                            </>
                          )}
                          {!readOnly &&
                            !file.is_removed &&
                            (isAdmin || clientCanMutateFile(file)) && (
                              <>
                                <MenuItem
                                  onSelect={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.onchange = () => {
                                      if (input.files?.[0])
                                        replaceFile(file.id, input.files[0], file);
                                    };
                                    input.click();
                                  }}
                                >
                                  Replace
                                </MenuItem>
                                <MenuItem onSelect={() => removeFile(file)}>Remove</MenuItem>
                              </>
                            )}
                          {!readOnly &&
                            !file.is_removed &&
                            !isAdmin &&
                            !clientCanMutateFile(file) && (
                              <MenuItem
                                onSelect={() => {
                                  const message = mutateBlockedReason(file);
                                  setErrors([message]);
                                  toast(message, { variant: 'warning' });
                                }}
                              >
                                {file.status === 'under_review'
                                  ? 'Locked — under review'
                                  : file.status === 'approved'
                                    ? 'Locked — approved'
                                    : 'Cannot change'}
                              </MenuItem>
                            )}
                          {isAdmin && file.is_removed && (
                            <MenuItem onSelect={() => restoreFile(file.id)}>Restore</MenuItem>
                          )}
                        </MenuContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </ActionsCell>
                </FileRow>
              ))}
            </CategoryBlock>
          );
        })}
      </div>

      <Modal
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        title="File versions"
        description="Previous versions remain available to admins."
      >
        {versions.map((v) => (
          <FileRow key={v.id}>
            <FileThumb file={v} portalToken={portalToken} onPreview={setPreview} />
            <div>
              <strong>
                v{v.version} — {v.original_filename}
              </strong>
              <div style={{ fontSize: '0.8rem' }}>
                {formatFileSize(v.file_size)} · {formatDateTime(v.created_at)}
                {v.is_removed ? ' · removed' : ''}
              </div>
            </div>
            <ActionsCell>
              {isImageMime(v.mime_type) && (
                <Button size="sm" variant="secondary" onClick={() => openPreview(v)}>
                  Preview
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => downloadFile(v.id)}>
                Download
              </Button>
            </ActionsCell>
          </FileRow>
        ))}
      </Modal>

      <Modal
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title={preview?.name || 'Preview'}
        size="lg"
      >
        {preview && (
          <PreviewFrame>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt={preview.name || 'File preview'} />
          </PreviewFrame>
        )}
      </Modal>
    </Section>
  );
}
