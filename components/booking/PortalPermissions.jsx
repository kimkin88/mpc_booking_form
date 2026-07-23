'use client';

import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Tabs';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Section, SectionTitle, SectionHint, Row, Grid } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/apiClient';
import { formatDateTime } from '@/utils/format';
import { BOOKING_SECTIONS, BOOKING_STATUSES, DEFAULT_FIELD_PERMISSIONS, DEFAULT_STATUS_PORTAL_EDITABLE, FIELD_LABELS, FIELD_PERMISSIONS } from '@/lib/constants';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';

const LinkBox = styled.div`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  background: ${({ theme }) => theme.colors.bgMuted};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space[4]};
  word-break: break-all;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.45;
`;

const LinkPanel = styled.div`
  margin-bottom: ${({ theme }) => theme.space[5]};
  padding: ${({ theme }) => theme.space[4]};
  background: ${({ theme, $warn }) =>
    $warn ? theme.colors.warningMuted : theme.colors.accentMuted};
  border: 1px solid
    ${({ theme, $warn }) => ($warn ? theme.colors.warning : theme.colors.accent)};
  border-radius: ${({ theme }) => theme.radii.lg};
`;

const LinkLabel = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $warn }) => ($warn ? theme.colors.warning : theme.colors.accent)};
`;

const MutedHint = styled.p`
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const AlertBanner = styled.div`
  margin-bottom: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.warning};
  background: ${({ theme }) => theme.colors.warningMuted};
  color: ${({ theme }) => theme.colors.warning};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  margin: 0 0 ${({ theme }) => theme.space[5]};
`;

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.55rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  background: ${({ theme, $tone }) => {
    if ($tone === 'hidden') return theme.colors.bgMuted;
    if ($tone === 'readonly') return theme.colors.infoMuted;
    if ($tone === 'editable') return theme.colors.successMuted;
    if ($tone === 'required') return theme.colors.primaryMuted;
    return theme.colors.bgMuted;
  }};
  color: ${({ theme, $tone }) => {
    if ($tone === 'hidden') return theme.colors.textMuted;
    if ($tone === 'readonly') return theme.colors.info;
    if ($tone === 'editable') return theme.colors.success;
    if ($tone === 'required') return theme.colors.primary;
    return theme.colors.text;
  }};
  border: 1px solid
    ${({ theme, $tone }) => {
      if ($tone === 'hidden') return theme.colors.border;
      if ($tone === 'readonly') return theme.colors.info;
      if ($tone === 'editable') return theme.colors.success;
      if ($tone === 'required') return theme.colors.primary;
      return theme.colors.border;
    }};
`;

const FieldRow = styled.div`
  position: relative;
  padding-left: ${({ theme }) => theme.space[3]};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 1.65rem;
    bottom: 0;
    width: 4px;
    border-radius: 2px;
    background: ${({ theme, $tone }) => {
      if ($tone === 'readonly') return theme.colors.info;
      if ($tone === 'editable') return theme.colors.success;
      if ($tone === 'required') return theme.colors.primary;
      return theme.colors.borderStrong;
    }};
  }
`;

function portalTone(status) {
  if (status === 'active' || status === 'submitted') return 'success';
  if (status === 'locked') return 'warning';
  if (status === 'disabled' || status === 'expired') return 'danger';
  return 'info';
}

export function PortalControls({ bookingId, portal: portalProp, onRefresh }) {
  const { toast } = useToast();
  const [portal, setPortal] = useState(portalProp || null);
  const [url, setUrl] = useState(portalProp?.url || null);
  const [expiry, setExpiry] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [statusEditable, setStatusEditable] = useState(() => ({
    ...DEFAULT_STATUS_PORTAL_EDITABLE,
    ...(portalProp?.status_portal_editable || {}),
  }));
  const [savingStatusMap, setSavingStatusMap] = useState(false);

  const syncFromPortal = useCallback((next) => {
    setPortal(next);
    setUrl(next?.url || null);
    if (next) {
      setStatusEditable({
        ...DEFAULT_STATUS_PORTAL_EDITABLE,
        ...(next.status_portal_editable || {}),
      });
    }
  }, []);

  const loadPortal = useCallback(async () => {
    try {
      const data = await api.get(`/api/bookings/${bookingId}/portal`);
      syncFromPortal(data);
      return data;
    } catch (err) {
      toast(err.message, { variant: 'error' });
      return null;
    }
  }, [bookingId, syncFromPortal, toast]);

  useEffect(() => {
    syncFromPortal(portalProp || null);
  }, [portalProp, syncFromPortal]);

  useEffect(() => {
    // Always re-fetch so the saved URL is visible even if parent payload is stale
    loadPortal();
  }, [loadPortal]);

  const run = async (action, extra = {}) => {
    setBusy(true);
    try {
      const data = await api.post(`/api/bookings/${bookingId}/portal`, { action, ...extra });
      if (action === 'generate' || action === 'regenerate') {
        const nextUrl = data.url || data.portal?.url || null;
        syncFromPortal(data.portal || null);
        if (nextUrl) setUrl(nextUrl);
        toast(
          action === 'regenerate'
            ? 'Portal link regenerated and saved'
            : 'Portal link generated and saved'
        );
      } else {
        syncFromPortal(data);
        toast('Portal updated');
      }
      await onRefresh?.();
      await loadPortal();
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const copyLink = async () => {
    if (!url) {
      toast('Generate a portal link first', { variant: 'warning' });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Portal link copied');
    } catch {
      toast('Could not copy — select the link and copy manually', { variant: 'error' });
    }
  };

  return (
    <Section>
      <SectionTitle>Client Portal Link</SectionTitle>
      <SectionHint>
        Generate a unique private link for the client. The saved link stays visible here and under
        Sent Links.
      </SectionHint>

      <Row style={{ marginBottom: '1rem' }}>
        {portal ? (
          <>
            <Badge $tone={portalTone(portal.status)}>{portal.status}</Badge>
            {portal.editing_locked && <Badge $tone="warning">Editing locked</Badge>}
            {portal.expires_at && (
              <Badge $tone="warning">Expires {formatDateTime(portal.expires_at)}</Badge>
            )}
            {portal.created_at && <Badge>Created {formatDateTime(portal.created_at)}</Badge>}
          </>
        ) : (
          <Badge>No link yet</Badge>
        )}
      </Row>

      {url ? (
        <LinkPanel>
          <LinkLabel>Saved client link</LinkLabel>
          <LinkBox aria-label="Saved portal link">{url}</LinkBox>
          <Row style={{ marginTop: '0.75rem' }}>
            <Button onClick={copyLink} disabled={busy}>
              Copy link
            </Button>
            <Button
              variant="secondary"
              disabled={!url}
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            >
              Open portal
            </Button>
            <Button disabled={busy} onClick={() => run(portal ? 'regenerate' : 'generate')}>
              Regenerate
            </Button>
          </Row>
        </LinkPanel>
      ) : (
        <LinkPanel $warn>
          <LinkLabel $warn>{portal ? 'Link not saved yet' : 'No portal link'}</LinkLabel>
          <MutedHint>
            {portal
              ? 'Regenerate to create a saved, viewable URL.'
              : 'Generate a unique client URL. It will be saved for copy and preview.'}
          </MutedHint>
          <Button disabled={busy} onClick={() => run(portal ? 'regenerate' : 'generate')}>
            {portal ? 'Regenerate Link' : 'Generate Link'}
          </Button>
        </LinkPanel>
      )}

      <Grid style={{ marginTop: '1.5rem' }} $cols={1}>
        <div>
          <Input
            label="Client PIN (optional)"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            hint={
              portal?.has_pin
                ? portal?.pin
                  ? 'A PIN is required to open this portal. The current PIN is saved below.'
                  : 'A PIN is required. Re-set it to store a viewable copy for admins.'
                : 'Leave blank for link-only access'
            }
            placeholder="4–8 digit PIN"
          />
          <Row style={{ marginTop: '0.5rem' }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !pin.trim()}
              onClick={async () => {
                await run('set_pin', { pin: pin.trim() });
                setPin('');
                setShowPin(true);
              }}
            >
              {portal?.has_pin ? 'Update PIN' : 'Set PIN'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || !portal?.has_pin}
              onClick={() => {
                setShowPin(false);
                run('reset_pin');
              }}
            >
              Remove PIN
            </Button>
            {portal?.has_pin && <Badge $tone="warning">PIN enabled</Badge>}
          </Row>

          {portal?.has_pin && (
            <LinkPanel style={{ marginTop: '0.85rem' }}>
              <LinkLabel>Saved client PIN</LinkLabel>
              {portal.pin ? (
                <>
                  <LinkBox aria-label="Saved portal PIN">
                    {showPin ? portal.pin : '•'.repeat(Math.max(portal.pin.length, 4))}
                  </LinkBox>
                  <Row style={{ marginTop: '0.75rem' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowPin((v) => !v)}
                    >
                      {showPin ? 'Hide PIN' : 'Show PIN'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(portal.pin);
                          toast('PIN copied');
                        } catch {
                          toast('Could not copy PIN', { variant: 'error' });
                        }
                      }}
                    >
                      Copy PIN
                    </Button>
                  </Row>
                </>
              ) : (
                <MutedHint style={{ marginBottom: 0 }}>
                  This PIN was set before viewable storage was enabled. Update the PIN to see and
                  copy it here.
                </MutedHint>
              )}
            </LinkPanel>
          )}
        </div>
      </Grid>

      <Grid style={{ marginTop: '1.5rem' }} $cols={1}>
        <div>
          <Input
            label="Optional expiry date"
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            hint="Leave empty for no expiry"
          />
          <Row style={{ marginTop: '0.5rem' }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !expiry}
              onClick={() => run('set_expiry', { expires_at: new Date(expiry).toISOString() })}
            >
              Set Expiry
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => run('set_expiry', { expires_at: null })}
            >
              Clear Expiry
            </Button>
          </Row>
        </div>
      </Grid>

      <Row style={{ marginTop: '1.25rem' }}>
        {portal?.status === 'locked' || portal?.editing_locked ? (
          <Button variant="accent" disabled={busy} onClick={() => run('unlock')}>
            Unlock editing
          </Button>
        ) : (
          <Button variant="secondary" disabled={busy || !portal} onClick={() => setConfirm('lock')}>
            Lock (read-only)
          </Button>
        )}
        {portal?.status === 'disabled' ? (
          <Button variant="accent" disabled={busy} onClick={() => run('enable')}>
            Re-enable Link
          </Button>
        ) : (
          <Button variant="danger" disabled={busy || !portal} onClick={() => setConfirm('disable')}>
            Disable Link
          </Button>
        )}
      </Row>

      <div style={{ marginTop: '1.75rem' }}>
        <SectionTitle as="h3" style={{ fontSize: '1rem' }}>
          Editable by booking status
        </SectionTitle>
        <SectionHint>
          When a status is off, the portal becomes read-only for that booking status (unless you
          unlock it later by changing status or these settings). Submit does not lock the portal by
          itself.
        </SectionHint>
        {!portal && (
          <AlertBanner>Generate a portal link before configuring status editability.</AlertBanner>
        )}
        <Grid $cols={2} style={{ marginTop: '0.75rem' }}>
          {BOOKING_STATUSES.map((s) => (
            <Switch
              key={s.value}
              id={`status-editable-${s.value}`}
              label={s.label}
              checked={!!statusEditable[s.value]}
              disabled={!portal || savingStatusMap}
              onCheckedChange={(checked) =>
                setStatusEditable((prev) => ({ ...prev, [s.value]: checked }))
              }
            />
          ))}
        </Grid>
        <Button
          style={{ marginTop: '0.75rem' }}
          disabled={!portal || savingStatusMap}
          onClick={async () => {
            setSavingStatusMap(true);
            try {
              const data = await api.post(`/api/bookings/${bookingId}/portal`, {
                action: 'set_status_editability',
                status_portal_editable: statusEditable,
              });
              syncFromPortal(data);
              toast('Status editability saved');
              await onRefresh?.();
            } catch (err) {
              toast(err.message, { variant: 'error' });
            } finally {
              setSavingStatusMap(false);
            }
          }}
        >
          {savingStatusMap ? 'Saving…' : 'Save status rules'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === 'lock'}
        onOpenChange={() => setConfirm(null)}
        title="Lock portal?"
        description="Clients can still open the link, but all fields become read-only."
        confirmLabel="Lock"
        onConfirm={() => run('lock')}
      />
      <ConfirmDialog
        open={confirm === 'disable'}
        onOpenChange={() => setConfirm(null)}
        title="Disable portal link?"
        description="Clients will no longer be able to open this booking via the link."
        confirmLabel="Disable"
        danger
        onConfirm={() => run('disable')}
      />
    </Section>
  );
}

function mergePermissionDefaults(permissions = {}) {
  const next = { ...DEFAULT_FIELD_PERMISSIONS };
  Object.entries(permissions).forEach(([key, value]) => {
    if (value) next[key] = value;
  });
  return next;
}

function permissionTone(value) {
  if (value === 'hidden') return 'hidden';
  if (value === 'readonly') return 'readonly';
  if (value === 'editable') return 'editable';
  if (value === 'required') return 'required';
  return 'hidden';
}

export function PermissionsPanel({
  permissions = {},
  onSave,
  hasPortal = false,
  portalLocked = false,
}) {
  const [local, setLocal] = useState(() => mergePermissionDefaults(permissions));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocal(mergePermissionDefaults(permissions));
  }, [permissions]);

  const handleSave = async () => {
    if (!hasPortal) {
      toast('Generate a portal link before saving permissions', { variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await onSave(local);
      toast('Portal permissions saved');
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section>
      <SectionTitle>What the client can change</SectionTitle>
      <SectionHint>
        These settings control the portal form only. Hidden fields disappear for the client.
        Required fields must be filled before Submit.
      </SectionHint>

      {!hasPortal && (
        <AlertBanner>Generate a portal link above before setting permissions.</AlertBanner>
      )}
      {hasPortal && portalLocked && (
        <AlertBanner>
          Portal is locked (read-only). Unlock editing above so Editable / Required fields work for
          the client.
        </AlertBanner>
      )}

      <Legend aria-label="Permission legend">
        <LegendItem $tone="hidden">Hidden — not shown</LegendItem>
        <LegendItem $tone="readonly">Read-only — visible, locked</LegendItem>
        <LegendItem $tone="editable">Editable — client can change</LegendItem>
        <LegendItem $tone="required">Required — must complete</LegendItem>
      </Legend>

      {BOOKING_SECTIONS.map((section) => {
        const fields = section.fields.filter(
          (key) => key !== 'internal_notes' && key !== 'status' && key !== 'portal'
        );
        if (!fields.length) return null;
        return (
          <div key={section.key} style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>{section.label}</h3>
            <Grid $cols={2}>
              {fields.map((key) => {
                const value = local[key] || DEFAULT_FIELD_PERMISSIONS[key] || 'hidden';
                return (
                  <FieldRow key={key} $tone={permissionTone(value)}>
                    <Select
                      label={FIELD_LABELS[key] || key}
                      value={value}
                      onValueChange={(v) => setLocal((p) => ({ ...p, [key]: v }))}
                      options={FIELD_PERMISSIONS}
                      disabled={!hasPortal}
                    />
                  </FieldRow>
                );
              })}
            </Grid>
          </div>
        );
      })}
      <Button onClick={handleSave} disabled={saving || !hasPortal} style={{ marginTop: '0.5rem' }}>
        {saving ? 'Saving…' : 'Save Permissions'}
      </Button>
    </Section>
  );
}
