'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styled from 'styled-components';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader, Row, FieldAddon } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger, Badge, LoadingBlock, Spinner } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  ReferenceBudgetSection,
  ClientCampaignSection,
  JcdContactSection,
  InvoiceSection,
  ClientNotesSection,
  InternalNotesSection,
} from '@/components/booking/FormSections';
import { ScheduleSection, SitesSection } from '@/components/booking/ScheduleSites';
import { FilesSection } from '@/components/files/FilesSection';
import { PortalControls, PermissionsPanel } from '@/components/booking/PortalPermissions';
import { ActivityLogPanel, VersionsPanel } from '@/components/activity/ActivityVersions';
import { PortalRecentUpdates } from '@/components/activity/PortalRecentUpdates';
import { api } from '@/lib/apiClient';
import { BOOKING_STATUSES } from '@/lib/constants';
import { permissionsArrayToMap } from '@/lib/permissions';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useRecentClientUpdates } from '@/hooks/useRecentClientUpdates';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import { formatDateTime } from '@/utils/format';

const UnsavedHint = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const FooterActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  justify-content: flex-end;

  a {
    text-decoration: none;
  }

  svg {
    width: 1.05rem;
    height: 1.05rem;
    flex-shrink: 0;
  }
`;

const SavedStatus = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0 ${({ theme }) => theme.space[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.success};
`;

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 13a5 5 0 0 0 7.54.54l2.92-2.92a5 5 0 0 0-7.07-7.07L11.5 5.44"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54L3.54 13.38a5 5 0 0 0 7.07 7.07L12.5 18.56"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 12h-4l-3 9L9 3l-3 9H2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VersionsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8v4l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.05 11a9 9 0 1 1 .5 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M3 16v-5h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PagePad = styled.div`
  padding-bottom: 5.5rem;
`;

const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]};
  margin-bottom: ${({ theme }) => theme.space[6]};
`;

const BookingFooter = styled.footer`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[4]}`};
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.md};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => `${theme.space[2]} ${theme.space[6]}`};
  }
`;

const FooterMeta = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  min-width: 12rem;
`;

const BookingLayout = styled.div`
  /* Shared offsets so Sections + Recent updates stay aligned */
  --panel-top: calc(5.25rem + ${({ theme }) => theme.space[4]});
  --panel-bottom: calc(4.25rem + ${({ theme }) => theme.space[4]});
`;

const Workspace = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[6]};
  align-items: start;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 240px minmax(0, 1fr) 260px;
  }
`;

const SideNavSpacer = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: block;
    width: 240px;
    flex-shrink: 0;
    pointer-events: none;
  }
`;

const MobileSections = styled.div`
  min-width: 0;
  margin-bottom: ${({ theme }) => theme.space[4]};

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

const SideNav = styled.nav`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: block;
    position: fixed;
    top: var(--panel-top);
    bottom: var(--panel-bottom);
    width: 240px;
    left: max(
      ${({ theme }) => theme.space[4]},
      calc(50% - 700px + ${({ theme }) => theme.space[4]})
    );
    z-index: ${({ theme }) => theme.zIndex.sticky - 1};
    overflow: auto;
  }
`;

const NavCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space[3]};
`;

const NavTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space[1]};
  padding: 0 ${({ theme }) => theme.space[2]};
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const NavHint = styled.p`
  margin: 0 0 ${({ theme }) => theme.space[3]};
  padding: 0 ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const VerticalTabsList = styled(TabsList)`
  flex-direction: column;
  align-items: stretch;
  border-bottom: none;
  overflow-x: visible;
  margin-bottom: 0;
  gap: 0.2rem;

  @media (max-width: 1023px) {
    flex-direction: row;
    overflow-x: auto;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    margin-bottom: ${({ theme }) => theme.space[4]};
    padding-bottom: 0;
  }
`;

const VerticalTabsTrigger = styled(TabsTrigger)`
  justify-content: flex-start;
  text-align: left;
  border-bottom: none;
  border-left: 3px solid transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 0.55rem 0.75rem;
  width: 100%;

  &[data-state='active'] {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primaryMuted};
    border-bottom-color: transparent;
    border-left-color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 1023px) {
    width: auto;
    border-left: none;
    border-bottom: 2px solid transparent;

    &[data-state='active'] {
      border-left-color: transparent;
      border-bottom-color: ${({ theme }) => theme.colors.primary};
      background: transparent;
      color: ${({ theme }) => theme.colors.text};
    }
  }
`;

const MainColumn = styled.div`
  min-width: 0;
`;

const UpdatesAside = styled.aside`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: var(--panel-top);
    bottom: var(--panel-bottom);
    width: 260px;
    right: max(
      ${({ theme }) => theme.space[4]},
      calc(50% - 700px + ${({ theme }) => theme.space[4]})
    );
    z-index: ${({ theme }) => theme.zIndex.sticky - 1};
    overflow: hidden;
  }
`;

const UpdatesSpacer = styled.div`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: block;
    width: 260px;
    flex-shrink: 0;
    pointer-events: none;
  }
`;

const UpdatesScroll = styled.div`
  flex: 1;
  min-height: 0;
  height: 100%;
`;

const MobileUpdates = styled.div`
  margin-top: ${({ theme }) => theme.space[6]};

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

const TAB_ITEMS = [
  { value: 'details', label: 'Details' },
  { value: 'schedule', label: 'Schedule & Sites' },
  { value: 'files', label: 'Files' },
  { value: 'portal', label: 'Portal & Permissions' },
  { value: 'history', label: 'Activity & Versions' },
];

function BookingSkeleton() {
  return (
    <AdminShell wide>
      <div style={{ marginBottom: '2rem' }}>
        <Skeleton $width="8rem" $height="0.75rem" style={{ marginBottom: 8 }} />
        <Skeleton $width="16rem" $height="2rem" style={{ marginBottom: 12 }} />
        <Skeleton $width="22rem" $height="1rem" />
      </div>
      <Skeleton $height="2.5rem" style={{ marginBottom: 24 }} />
      <Skeleton $height="12rem" style={{ marginBottom: 16 }} />
      <Skeleton $height="12rem" />
      <LoadingBlock className="sr-only">
        <Spinner /> Loading booking…
      </LoadingBlock>
    </AdminShell>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState('details');
  const [updatesRole, setUpdatesRole] = useState('client');

  useUnsavedChanges(dirty);

  const load = useCallback(async () => {
    const result = await api.get(`/api/bookings/${id}`);
    setData(result);
    setForm({ ...result.booking });
    setDirty(false);
    return result;
  }, [id]);

  const onClientActivity = useCallback(async () => {
    try {
      const result = await api.get(`/api/bookings/${id}`);
      setData(result);
      setForm((prev) => {
        if (!prev) return { ...result.booking };
        if (dirty) {
          // Keep in-progress edits; still sync booking status from the client.
          return { ...prev, status: result.booking.status };
        }
        return { ...result.booking };
      });
      toast('Booking updated from portal');
    } catch {
      // Keep last good snapshot; activity poll already swallowed its own errors.
    }
  }, [id, dirty, toast]);

  const {
    items: recentUpdates,
    refresh: refreshRecentUpdates,
  } = useRecentClientUpdates(id, {
    intervalMs: 4000,
    enabled: !loading,
    role: updatesRole,
    onClientActivity,
  });

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => {
        toast(err.message, { variant: 'error' });
        if (err.status === 404) router.push('/admin');
      })
      .finally(() => setLoading(false));
  }, [load, router, toast]);

  const onChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const permissionsMap = useMemo(
    () => permissionsArrayToMap(data?.permissions),
    [data?.permissions]
  );

  const save = async (overrideConflict = false) => {
    setSaving(true);
    setErrors({});
    try {
      if (form.client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.client_email)) {
        setErrors({ client_email: 'Enter a valid email address' });
        toast('Fix the highlighted fields before saving', { variant: 'error' });
        setSaving(false);
        return;
      }
      if (form.jcd_contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.jcd_contact_email)) {
        setErrors({ jcd_contact_email: 'Enter a valid email address' });
        toast('Fix the highlighted fields before saving', { variant: 'error' });
        setSaving(false);
        return;
      }
      if (Array.isArray(form.cc_emails)) {
        for (const email of form.cc_emails) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setErrors({ cc_emails: `Invalid email: ${email}` });
            toast('Fix the highlighted fields before saving', { variant: 'error' });
            setSaving(false);
            return;
          }
        }
      }
      if (form.po_required && !form.po_number && form.status === 'completed') {
        setErrors({ po_number: 'PO Number is required when PO Required is enabled' });
        toast('PO Number is required to mark this booking complete', { variant: 'error' });
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        expected_version: overrideConflict ? undefined : data.booking.current_version,
        allow_po_override: true,
      };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.created_by;
      delete payload.current_version;

      await api.patch(`/api/bookings/${id}`, payload);
      toast('Booking saved');
      await load();
      refreshRecentUpdates();
    } catch (err) {
      if (err.code === 'VERSION_CONFLICT') {
        setConflict(err.extra?.current || err.extra);
        toast('Conflict detected — review before overwriting', { variant: 'warning' });
      } else {
        toast(err.message, { variant: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const refreshRelated = async () => {
    await load();
    refreshRecentUpdates();
  };

  useDataRefresh(refreshRelated);

  const updatesPanelProps = {
    items: recentUpdates,
    title: 'Recent updates',
    role: updatesRole,
    onRoleChange: setUpdatesRole,
    hint:
      updatesRole === 'admin'
        ? 'Admin changes on this booking'
        : updatesRole === 'all'
          ? 'Client and admin changes on this booking'
          : 'Live client changes on this booking',
    empty:
      updatesRole === 'admin'
        ? 'No admin updates yet.'
        : updatesRole === 'all'
          ? 'No updates yet.'
          : 'No client updates yet. Changes from the portal will appear here.',
  };

  if (loading || !form) {
    return <BookingSkeleton />;
  }

  const renderSectionsNav = () => (
    <NavCard>
      <NavTitle>Sections</NavTitle>
      <NavHint>Jump between booking areas</NavHint>
      <VerticalTabsList aria-label="Booking sections">
        {TAB_ITEMS.map((item) => (
          <VerticalTabsTrigger key={item.value} value={item.value}>
            {item.label}
          </VerticalTabsTrigger>
        ))}
      </VerticalTabsList>
    </NavCard>
  );

  return (
    <AdminShell wide>
      <BookingLayout>
        <Tabs value={tab} onValueChange={setTab} orientation="vertical">
          <PagePad>
            <Workspace>
              <SideNavSpacer aria-hidden />

              <MainColumn>
                <PageHeader
                  breadcrumbs={[
                    { label: 'Bookings', href: '/admin' },
                    { label: form.sb_number || 'Booking' },
                  ]}
                  eyebrow={form.sb_number}
                  title={form.campaign_name || form.client_company || 'Untitled booking'}
                />

                <StatusRow>
                  <div style={{ minWidth: 220, flex: '1 1 220px' }}>
                    <Select
                      label="Booking Status"
                      value={form.status}
                      onValueChange={(v) => onChange('status', v)}
                      options={BOOKING_STATUSES}
                    />
                  </div>
                  <FieldAddon $withLabel>
                    <Badge $tone="info">v{form.current_version}</Badge>
                    {dirty && <Badge $tone="warning">Unsaved changes</Badge>}
                  </FieldAddon>
                </StatusRow>

                <MobileSections>{renderSectionsNav()}</MobileSections>
                <TabsContent value="details">
                  <ReferenceBudgetSection values={form} onChange={onChange} errors={errors} />
                  <ClientCampaignSection values={form} onChange={onChange} errors={errors} />
                  <JcdContactSection values={form} onChange={onChange} errors={errors} />
                  <InvoiceSection values={form} onChange={onChange} errors={errors} allowPoOverride />
                  <ClientNotesSection values={form} onChange={onChange} />
                  <InternalNotesSection values={form} onChange={onChange} />
                </TabsContent>

              <TabsContent value="schedule">
                <ScheduleSection
                  entries={data.schedule}
                  onAdd={async (entry) => {
                    await api.post(`/api/bookings/${id}/schedule`, entry);
                    toast('Schedule entry added');
                    await refreshRelated();
                  }}
                  onUpdate={async (entry) => {
                    await api.patch(`/api/bookings/${id}/schedule`, entry);
                    toast('Schedule entry updated');
                    await refreshRelated();
                  }}
                  onRemove={async (entryId) => {
                    await api.delete(`/api/bookings/${id}/schedule`, { entryId });
                    toast('Schedule entry removed');
                    await refreshRelated();
                  }}
                />
                <SitesSection
                  values={form}
                  onChange={onChange}
                  sites={data.sites}
                  onAdd={async (entry) => {
                    await api.post(`/api/bookings/${id}/sites`, entry);
                    toast('Site added');
                    await refreshRelated();
                  }}
                  onRemove={async (entryId) => {
                    await api.delete(`/api/bookings/${id}/sites`, { entryId });
                    toast('Site removed');
                    await refreshRelated();
                  }}
                />
              </TabsContent>

              <TabsContent value="files">
                <FilesSection
                  bookingId={id}
                  files={data.files}
                  categoryStatuses={data.categoryStatuses}
                  onRefresh={refreshRelated}
                  isAdmin
                />
              </TabsContent>

              <TabsContent value="portal">
                <PortalControls bookingId={id} portal={data.portal} onRefresh={refreshRelated} />
                <PermissionsPanel
                  key={data.portal?.id || `booking-${id}`}
                  permissions={permissionsMap}
                  hasPortal={!!data.portal}
                  portalLocked={
                    data.portal?.status === 'locked' ||
                    data.portal?.status === 'disabled' ||
                    !!data.portal?.editing_locked
                  }
                  onSave={async (perms) => {
                    await api.put(`/api/bookings/${id}/permissions`, { permissions: perms });
                    await refreshRelated();
                  }}
                />
              </TabsContent>

              <TabsContent value="history">
                <ActivityLogPanel bookingId={id} />
                <VersionsPanel
                  bookingId={id}
                  currentVersion={form.current_version}
                  onReverted={refreshRelated}
                />
              </TabsContent>

              <MobileUpdates>
                <PortalRecentUpdates {...updatesPanelProps} />
              </MobileUpdates>
            </MainColumn>

              <UpdatesSpacer aria-hidden />
            </Workspace>
          </PagePad>

          <SideNav>{renderSectionsNav()}</SideNav>
        </Tabs>

        <UpdatesAside aria-label="Recent client updates">
          <UpdatesScroll>
            <ScrollArea type="scroll">
              <PortalRecentUpdates {...updatesPanelProps} />
            </ScrollArea>
          </UpdatesScroll>
        </UpdatesAside>

        <BookingFooter role="contentinfo" aria-live="polite">
          <FooterMeta>
            Version {form.current_version} · Updated {formatDateTime(form.updated_at)}
            {dirty ? (
              <>
                {' · '}
                <UnsavedHint>Unsaved changes</UnsavedHint>
              </>
            ) : null}
          </FooterMeta>
          <FooterActions>
            {dirty && (
              <Button
                variant="secondary"
                onClick={async () => {
                  await load();
                  toast('Changes discarded');
                }}
                disabled={saving}
              >
                Discard
              </Button>
            )}
            {dirty ? (
              <Button onClick={() => save()} loading={saving} disabled={saving}>
                {saving ? 'Saving…' : 'Save Booking'}
              </Button>
            ) : (
              <SavedStatus aria-live="polite">Saved</SavedStatus>
            )}
            {data?.portal?.url && (
              <Button
                variant="accent"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(data.portal.url);
                    toast('Portal link copied');
                  } catch {
                    toast('Could not copy link', { variant: 'error' });
                  }
                }}
              >
                <LinkIcon />
                Copy portal link
              </Button>
            )}
            <Link href={`/admin/bookings/${id}/activity`}>
              <Button variant="secondary">
                <ActivityIcon />
                Activity
              </Button>
            </Link>
            <Link href={`/admin/bookings/${id}/versions`}>
              <Button variant="secondary">
                <VersionsIcon />
                Versions
              </Button>
            </Link>
          </FooterActions>
        </BookingFooter>

        <Modal
          open={!!conflict}
          onOpenChange={() => setConflict(null)}
          title="Version conflict"
          description="Another user saved changes while you were editing. Review before overwriting."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={async () => {
                  setConflict(null);
                  await load();
                  toast('Loaded latest version');
                }}
              >
                Load Latest
              </Button>
              <Button
                onClick={async () => {
                  setConflict(null);
                  await save(true);
                }}
              >
                Overwrite Anyway
              </Button>
            </>
          }
        >
          {conflict && (
            <p>
              Current saved version is v{conflict.current_version}. Your edit was based on an older
              version.
            </p>
          )}
        </Modal>
      </BookingLayout>
    </AdminShell>
  );
}
