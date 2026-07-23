'use client';

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, EmptyState, LoadingBlock, Spinner } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Dialog';
import { Section, SectionTitle, SectionHint, Row } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/apiClient';
import { formatDate, formatDateTime } from '@/utils/format';
import { FIELD_LABELS } from '@/lib/constants';
import { useDebouncedValue } from '@/hooks/useUnsavedChanges';
import { useDataRefresh } from '@/contexts/DataRefreshContext';

const Tree = styled.div`
  margin-top: ${({ theme }) => theme.space[4]};
`;

const DayGroup = styled.section`
  margin-bottom: ${({ theme }) => theme.space[6]};
`;

const DayHeading = styled.h3`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Session = styled.article`
  position: relative;
  padding-left: ${({ theme }) => theme.space[5]};
  margin-bottom: ${({ theme }) => theme.space[4]};

  &::before {
    content: '';
    position: absolute;
    left: 0.35rem;
    top: 0.55rem;
    bottom: 0;
    width: 2px;
    background: ${({ theme }) => theme.colors.border};
  }

  &:last-child::before {
    bottom: 0.5rem;
  }
`;

const SessionDot = styled.span`
  position: absolute;
  left: 0;
  top: 0.45rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  border: 2px solid ${({ theme }) => theme.colors.surface};
  box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primary};
`;

const SessionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[2]};
  margin-bottom: ${({ theme }) => theme.space[2]};
`;

const SessionTime = styled.time`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-variant-numeric: tabular-nums;
`;

const SessionMeta = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ClientName = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const ClientDetail = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 0.15rem;
`;

const ChangeList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0 0 0 ${({ theme }) => theme.space[1]};
`;

const ChangeItem = styled.li`
  position: relative;
  padding: ${({ theme }) => `${theme.space[2]} 0 ${theme.space[2]} ${theme.space[4]}`};
  border-left: 2px solid ${({ theme }) => theme.colors.border};
  margin-left: ${({ theme }) => theme.space[2]};

  &::before {
    content: '';
    position: absolute;
    left: -0.3rem;
    top: 0.95rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.borderStrong};
  }
`;

const FieldName = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: 0.25rem;
`;

const ValueFlow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.4;
`;

const ValueChip = styled.span`
  display: inline-block;
  max-width: 100%;
  padding: 0.2rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $tone }) =>
    $tone === 'from' ? theme.colors.dangerMuted : theme.colors.successMuted};
  color: ${({ theme, $tone }) =>
    $tone === 'from' ? theme.colors.danger : theme.colors.success};
  word-break: break-word;
  white-space: pre-wrap;
`;

const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  flex-shrink: 0;
`;

const Entry = styled.article`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space[4]};
  margin-bottom: ${({ theme }) => theme.space[3]};
  background: ${({ theme }) => theme.colors.surface};
`;

const Diff = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[3]};
  margin-top: ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const DiffPane = styled.div`
  background: ${({ theme, $tone }) =>
    $tone === 'before' ? theme.colors.dangerMuted : theme.colors.successMuted};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => theme.space[3]};
  white-space: pre-wrap;
  word-break: break-word;
`;

const ACTION_LABELS = {
  field_updated: 'updated a field',
  status_changed: 'changed booking status',
  schedule_entry_added: 'added a schedule entry',
  schedule_entry_updated: 'updated a schedule entry',
  schedule_entry_removed: 'removed a schedule entry',
  site_entry_added: 'added a site',
  site_entry_updated: 'updated a site',
  site_entry_removed: 'removed a site',
  file_uploaded: 'uploaded a file',
  file_replaced: 'replaced a file',
  file_removed: 'removed a file',
  file_status_changed: 'changed a file status',
  booking_submitted: 'submitted the booking',
  portal_opened: 'opened the portal',
  mpc_chooses_sites_enabled: 'turned on MPC Chooses Sites',
  mpc_chooses_sites_disabled: 'turned off MPC Chooses Sites',
};

function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Empty';
    return value.map((v) => formatValue(v)).join(', ');
  }
  if (typeof value === 'object') {
    if (value.original_filename) return value.original_filename;
    if (value.format && value.shoot_date) {
      return `${value.format} on ${value.shoot_date}`;
    }
    if (value.site_name) {
      return value.type ? `${value.site_name} (${value.type})` : value.site_name;
    }
    if (value.filename) return value.filename;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function fieldLabel(item) {
  if (item.field_name) return FIELD_LABELS[item.field_name] || humanize(item.field_name);
  if (item.section) return FIELD_LABELS[item.section] || humanize(item.section);
  return humanize(item.action || 'Change');
}

function humanize(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionSummary(item) {
  return ACTION_LABELS[item.action] || humanize(item.action);
}

function dayKey(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toISOString().slice(0, 10);
}

function timeLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function dayHeading(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const key = d.toISOString().slice(0, 10);
  if (key === today.toISOString().slice(0, 10)) return 'Today';
  if (key === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return formatDate(d);
}

/**
 * Group flat activity rows into date → session (same minute + version) → changes.
 */
function buildActivityTree(items) {
  const byDay = new Map();

  items.forEach((item) => {
    const day = dayKey(item.created_at);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(item);
  });

  return Array.from(byDay.entries()).map(([day, dayItems]) => {
    const sessions = [];
    dayItems.forEach((item) => {
      const stamp = `${timeLabel(item.created_at)}|${item.version_number ?? ''}|${item.actor_name || ''}`;
      const last = sessions[sessions.length - 1];
      if (last && last.stamp === stamp) {
        last.changes.push(item);
      } else {
        sessions.push({
          stamp,
          id: item.id,
          created_at: item.created_at,
          actor_name: item.actor_name || 'Client',
          client_name: item.client_name || null,
          client_company: item.client_company || null,
          client_email: item.client_email || null,
          version_number: item.version_number,
          summary: actionSummary(item),
          changes: [item],
        });
      }
    });
    return { day, label: dayHeading(dayItems[0]?.created_at), sessions };
  });
}

function itemMatchesSearch(item, q) {
  if (!q) return true;
  const hay = [
    item.action,
    item.field_name,
    item.section,
    item.actor_name,
    item.client_name,
    item.client_company,
    item.client_email,
    fieldLabel(item),
    formatValue(item.previous_value),
    formatValue(item.new_value),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function ActivityLogPanel({ bookingId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const debouncedSearch = useDebouncedValue(search, 250);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/api/bookings/${bookingId}/activity?limit=200`)
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) toast(err.message, { variant: 'error' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, toast, reloadToken]);

  useDataRefresh(() => setReloadToken((n) => n + 1));

  const filtered = useMemo(
    () => items.filter((item) => itemMatchesSearch(item, debouncedSearch.trim())),
    [items, debouncedSearch]
  );

  const tree = useMemo(() => buildActivityTree(filtered), [filtered]);

  return (
    <Section>
      <SectionTitle>Activity Log</SectionTitle>
      <SectionHint>
        Client field edits only. Admin changes are tracked in Versions.
        Newest first.
      </SectionHint>

      <Input
        label="Search changes"
        placeholder="Client, field name, or value…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        hint={debouncedSearch ? `${filtered.length} matching change${filtered.length === 1 ? '' : 's'}` : undefined}
      />

      {loading && (
        <LoadingBlock>
          <Spinner /> Loading activity…
        </LoadingBlock>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState style={{ marginTop: '1.25rem' }}>
          {items.length === 0 ? 'No client edits yet' : 'No changes match your search'}
        </EmptyState>
      )}

      {!loading && tree.length > 0 && (
        <Tree>
          {tree.map((group) => (
            <DayGroup key={group.day}>
              <DayHeading>{group.label}</DayHeading>
              {group.sessions.map((session) => (
                <Session key={session.id}>
                  <SessionDot aria-hidden />
                  <SessionHead>
                    <SessionTime dateTime={session.created_at}>
                      {timeLabel(session.created_at)}
                    </SessionTime>
                    <div>
                      <SessionMeta>
                        <ClientName>{session.actor_name}</ClientName> {session.summary}
                        {session.version_number != null ? ` · v${session.version_number}` : ''}
                      </SessionMeta>
                      {(session.client_email ||
                        (session.client_company &&
                          !String(session.actor_name || '').includes(session.client_company))) && (
                        <ClientDetail>
                          {[
                            session.client_company &&
                            !String(session.actor_name || '').includes(session.client_company)
                              ? session.client_company
                              : null,
                            session.client_email,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </ClientDetail>
                      )}
                    </div>
                  </SessionHead>
                  <ChangeList>
                    {session.changes.map((item) => {
                      const hasValues =
                        item.previous_value != null ||
                        item.new_value != null ||
                        item.action === 'field_updated' ||
                        item.action === 'status_changed';

                      return (
                        <ChangeItem key={item.id}>
                          <FieldName>{fieldLabel(item)}</FieldName>
                          {hasValues ? (
                            <ValueFlow>
                              <ValueChip $tone="from">{formatValue(item.previous_value)}</ValueChip>
                              <Arrow aria-hidden>→</Arrow>
                              <ValueChip $tone="to">{formatValue(item.new_value)}</ValueChip>
                            </ValueFlow>
                          ) : (
                            <SessionMeta>{actionSummary(item)}</SessionMeta>
                          )}
                        </ChangeItem>
                      );
                    })}
                  </ChangeList>
                </Session>
              ))}
            </DayGroup>
          ))}
        </Tree>
      )}
    </Section>
  );
}

function VersionChangesPreview({ preview, mode = 'full', restoreLabels = false }) {
  if (!preview) return null;

  return (
    <>
      <p>
        Current v{preview.currentVersion} → Target v{preview.targetVersion}
      </p>
      {preview.changes?.length === 0 && <p>No field differences detected.</p>}
      {preview.changes?.map((c) => (
        <Diff key={c.field}>
          <DiffPane $tone="before">
            <strong>{FIELD_LABELS[c.field] || c.field} (current)</strong>
            <div>{formatValue(c.previous)}</div>
          </DiffPane>
          <DiffPane $tone="after">
            <strong>{restoreLabels ? 'Will restore' : 'In this version'}</strong>
            <div>{formatValue(c.next)}</div>
          </DiffPane>
        </Diff>
      ))}
      {mode === 'full' && preview.filesInTarget?.length > 0 && (
        <p style={{ marginTop: '1rem' }}>Files in target version: {preview.filesInTarget.length}</p>
      )}
    </>
  );
}

export function VersionsPanel({ bookingId, currentVersion, onReverted }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [viewPreview, setViewPreview] = useState(null);
  const [viewVersion, setViewVersion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('full');
  const [section, setSection] = useState('client');
  const [fieldName, setFieldName] = useState('campaign_name');
  const [reloadToken, setReloadToken] = useState(0);
  const { toast } = useToast();

  const sectionOptions = [
    { value: 'reference', label: 'Reference & Budget' },
    { value: 'client', label: 'Client & Campaign' },
    { value: 'jcd_contact', label: 'JCD Contact' },
    { value: 'sites', label: 'Sites (toggle)' },
    { value: 'invoice', label: 'Invoice & PO' },
    { value: 'notes', label: 'Notes' },
    { value: 'status', label: 'Status' },
    { value: 'schedule', label: 'Schedule entries' },
  ];

  const fieldOptions = Object.entries(FIELD_LABELS)
    .filter(([key]) => !['portal', 'files', 'schedule', 'sites'].includes(key))
    .map(([value, label]) => ({ value, label }));

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/bookings/${bookingId}/versions`)
      .then(setVersions)
      .catch((err) => toast(err.message, { variant: 'error' }))
      .finally(() => setLoading(false));
  }, [bookingId, toast, reloadToken]);

  useDataRefresh(() => setReloadToken((n) => n + 1));

  const fetchPreview = async (versionNumber, previewMode = mode) => {
    return api.post(`/api/bookings/${bookingId}/versions`, {
      action: 'preview',
      targetVersion: versionNumber,
      mode: previewMode,
      section: previewMode === 'section' ? section : undefined,
      fieldName: previewMode === 'field' ? fieldName : undefined,
    });
  };

  const openViewChanges = async (versionNumber) => {
    try {
      const data = await fetchPreview(versionNumber, 'full');
      setViewPreview(data);
      setViewVersion(versionNumber);
    } catch (err) {
      toast(err.message, { variant: 'error' });
    }
  };

  const openPreview = async (versionNumber) => {
    try {
      const data = await fetchPreview(versionNumber);
      setPreview(data);
      setConfirm(versionNumber);
    } catch (err) {
      toast(err.message, { variant: 'error' });
    }
  };

  const doRevert = async () => {
    setBusy(true);
    try {
      await api.post(`/api/bookings/${bookingId}/versions`, {
        action: 'revert',
        targetVersion: confirm,
        mode,
        section: mode === 'section' ? section : undefined,
        fieldName: mode === 'field' ? fieldName : undefined,
      });
      toast(`Reverted (${mode}) to version ${confirm}. A new version was created.`);
      setConfirm(null);
      setPreview(null);
      onReverted?.();
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section>
      <SectionTitle>Version History</SectionTitle>
      <SectionHint>
        Revert the full booking, one section, or one field. Reverting always creates a new version.
        Current: v{currentVersion}
      </SectionHint>

      <Row style={{ marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <Select
            label="Revert mode"
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'full', label: 'Full booking' },
              { value: 'section', label: 'One section' },
              { value: 'field', label: 'One field' },
            ]}
          />
        </div>
        {mode === 'section' && (
          <div style={{ minWidth: 200 }}>
            <Select
              label="Section"
              value={section}
              onValueChange={setSection}
              options={sectionOptions}
            />
          </div>
        )}
        {mode === 'field' && (
          <div style={{ minWidth: 220 }}>
            <Select
              label="Field"
              value={fieldName}
              onValueChange={setFieldName}
              options={fieldOptions}
            />
          </div>
        )}
      </Row>

      {loading && (
        <LoadingBlock>
          <Spinner /> Loading versions…
        </LoadingBlock>
      )}

      {!loading &&
        versions.map((v) => (
          <Entry key={v.id}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div>
                  <strong>Version {v.version_number}</strong>
                  {v.version_number === currentVersion && (
                    <Badge $tone="success" style={{ marginLeft: 8 }}>
                      Current
                    </Badge>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>{formatDateTime(v.created_at)}</div>
                <Row style={{ marginTop: 6 }}>
                  <Badge>{v.created_by_name || 'Unknown'}</Badge>
                  <Badge $tone="info">{v.source?.replace(/_/g, ' ')}</Badge>
                </Row>
              </div>
              <Row style={{ flexShrink: 0, marginLeft: 'auto' }}>
                <Button size="sm" variant="secondary" onClick={() => openViewChanges(v.version_number)}>
                  View Changes
                </Button>
                {v.version_number !== currentVersion && (
                  <Button size="sm" onClick={() => openPreview(v.version_number)}>
                    Compare & Revert
                  </Button>
                )}
              </Row>
            </Row>
          </Entry>
        ))}

      <Modal
        open={!!viewVersion}
        onOpenChange={() => {
          setViewVersion(null);
          setViewPreview(null);
        }}
        title={`Version ${viewVersion} changes`}
        description="Differences between the current booking and this version."
        footer={
          <Button variant="secondary" onClick={() => setViewVersion(null)}>
            Close
          </Button>
        }
      >
        <VersionChangesPreview preview={viewPreview} mode="full" />
      </Modal>

      <Modal
        open={!!confirm}
        onOpenChange={() => {
          setConfirm(null);
          setPreview(null);
        }}
        title={`Revert to version ${confirm}?`}
        description={`Mode: ${mode}${mode === 'section' ? ` · ${section}` : ''}${
          mode === 'field' ? ` · ${FIELD_LABELS[fieldName] || fieldName}` : ''
        }. This creates a new version.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={doRevert} disabled={busy}>
              {busy ? 'Reverting…' : 'Confirm Revert'}
            </Button>
          </>
        }
      >
        <VersionChangesPreview preview={preview} mode={mode} restoreLabels />
      </Modal>
    </Section>
  );
}
