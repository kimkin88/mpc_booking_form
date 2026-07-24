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
import { formatDate, formatDateTime } from '@/utils/format';
import { BOOKING_SECTIONS, BOOKING_STATUSES, DEFAULT_FIELD_PERMISSIONS, DEFAULT_STATUS_PORTAL_EDITABLE, FIELD_LABELS, FIELD_PERMISSIONS } from '@/lib/constants';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';

const ReminderList = styled.ul`
  margin: 0.75rem 0 0;
  padding-left: 1.1rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const MissingList = styled.ul`
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.warning};
`;

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

function AutomationPanel({ bookingId, lockDate: lockDateProp, onRefresh }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get(`/api/bookings/${bookingId}/reminders`);
      setData(result);
    } catch (err) {
      toast(err.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [bookingId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const lockDate = data?.portal_lock_date || lockDateProp;
  const autoLock = data?.auto_lock_enabled !== false;
  const missing = data?.missing || [];
  const reminders = data?.reminders || [];

  return (
    <div style={{ marginTop: '1.75rem' }}>
      <SectionTitle as="h3" style={{ fontSize: '1rem' }}>
        Auto-lock & reminders
      </SectionTitle>
      <SectionHint>
        Portal locks automatically on the lock date (7 days before in-charge start). Missing-field
        reminders go out 3 days and 1 day before lock. Emails send via Resend when configured;
        otherwise they are logged in-app.
      </SectionHint>

      {loading ? (
        <MutedHint>Loading automation status…</MutedHint>
      ) : (
        <>
          <Grid $cols={2} style={{ marginTop: '0.75rem' }}>
            <div>
              <MutedHint style={{ marginBottom: 4 }}>Portal lock date</MutedHint>
              <strong>{lockDate ? formatDate(lockDate) : 'Not calculated yet'}</strong>
              <MutedHint style={{ marginTop: 6 }}>
                Set campaign start date on the booking to calculate this.
              </MutedHint>
            </div>
            <Switch
              id="auto_lock_enabled"
              label="Automatic lock enabled"
              checked={autoLock}
              disabled={busy}
              onCheckedChange={async (enabled) => {
                setBusy(true);
                try {
                  await api.post(`/api/bookings/${bookingId}/reminders`, {
                    action: 'set_auto_lock',
                    enabled,
                  });
                  toast(enabled ? 'Auto-lock enabled' : 'Auto-lock disabled');
                  await load();
                  await onRefresh?.();
                } catch (err) {
                  toast(err.message, { variant: 'error' });
                } finally {
                  setBusy(false);
                }
              }}
              description="When off, this booking will not auto-lock or send scheduled reminders."
            />
          </Grid>

          <div style={{ marginTop: '1rem' }}>
            <MutedHint style={{ marginBottom: 4 }}>Missing fields right now</MutedHint>
            {missing.length === 0 ? (
              <Badge $tone="success">All required items look complete</Badge>
            ) : (
              <MissingList>
                {missing.map((m) => (
                  <li key={m.key}>{m.label}</li>
                ))}
              </MissingList>
            )}
          </div>

          <Row style={{ marginTop: '1rem' }}>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api.post(`/api/bookings/${bookingId}/reminders`, {
                    action: 'resend',
                  });
                  if (result.skipped && result.reason === 'complete') {
                    toast('Nothing missing — reminder not required');
                  } else if (result.ok === false && result.reason === 'no_email') {
                    toast('No recipient emails on this booking', { variant: 'error' });
                  } else {
                    toast(
                      result.deliveryStatus === 'stubbed'
                        ? 'Reminder logged (email provider not configured)'
                        : 'Reminder sent'
                    );
                  }
                  await load();
                } catch (err) {
                  toast(err.message, { variant: 'error' });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Sending…' : 'Send missing-fields reminder now'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={load}>
              Refresh
            </Button>
          </Row>

          {reminders.length > 0 && (
            <ReminderList>
              {reminders.slice(0, 8).map((r) => (
                <li key={r.id}>
                  {r.reminder_type} · {r.delivery_status}
                  {r.sent_at ? ` · ${formatDateTime(r.sent_at)}` : ''}
                  {r.error_message ? ` · ${r.error_message}` : ''}
                </li>
              ))}
            </ReminderList>
          )}
        </>
      )}
    </div>
  );
}

export function PortalControls({ bookingId, portal: portalProp, booking = null, onRefresh }) {
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
      } else if (action === 'unlock') {
        const { _meta, ...portalData } = data || {};
        syncFromPortal(portalData);
        const bits = ['Portal unlocked — clients can edit again'];
        if (_meta?.autoLockDisabled) {
          bits.push('auto-lock turned off so it will not re-lock immediately');
        }
        toast(bits.join(' · '));
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
            {portal.manual_unlock && portal.status === 'active' && !portal.editing_locked && (
              <Badge $tone="success">Editing unlocked</Badge>
            )}
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

      <AutomationPanel
        bookingId={bookingId}
        lockDate={booking?.portal_lock_date}
        onRefresh={onRefresh}
      />

      <div style={{ marginTop: '1.75rem' }}>
        <SectionTitle as="h3" style={{ fontSize: '1rem' }}>
          Editable by booking status
        </SectionTitle>
        <SectionHint>
          When a status is off, the portal is read-only for that booking status. Clicking{' '}
          <strong>Unlock editing</strong> overrides this for the current status and suppresses
          auto-lock until you lock the portal again. Submit does not lock the portal by itself.
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
  portalEditableHint = null,
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
      {hasPortal && !portalLocked && portalEditableHint && (
        <AlertBanner>{portalEditableHint}</AlertBanner>
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
