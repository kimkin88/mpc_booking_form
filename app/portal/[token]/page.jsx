'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import styled, { keyframes } from 'styled-components';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, EmptyState, Spinner } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import {
  CampaignDetailsSection,
  ContactInformationSection,
  DeliverablesSection,
} from '@/components/booking/FormSections';
import { ShootRequirementsSection } from '@/components/booking/ShootRequirements';
import { CalendarSection } from '@/components/booking/ScheduleSites';
import { FilesSection } from '@/components/files/FilesSection';
import { PoDocumentUploader } from '@/components/files/PoDocumentUploader';
import { PortalRecentUpdates } from '@/components/activity/PortalRecentUpdates';
import { PortalSectionNav } from '@/components/booking/PortalSectionNav';
import { RateCardPanel } from '@/components/booking/RateCardPanel';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { HelpGuideButton } from '@/components/layout/HelpGuideButton';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { portalRequest } from '@/lib/apiClient';
import { buildClientFieldState, canClientEdit, getFieldPermission } from '@/lib/permissions';
import { shootRequirementsFromSchedule } from '@/lib/calendarFormats';
import {
  BOOKING_SECTIONS,
  BOOKING_STATUSES,
  DELIVERABLE_FILE_CATEGORIES,
} from '@/lib/constants';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { usePortalRemoteSync } from '@/hooks/usePortalRemoteSync';
import { bookingSyncFingerprint } from '@/lib/syncFingerprints';

const EMPTY_PERMISSIONS = {};

function bookingStatusTone(status) {
  if (status === 'approved' || status === 'completed') return 'success';
  if (status === 'cancelled' || status === 'archived') return 'danger';
  if (status === 'ready_for_review' || status === 'changes_requested') return 'warning';
  if (status === 'client_updating' || status === 'waiting_for_client' || status === 'in_production') {
    return 'info';
  }
  return 'neutral';
}

function bookingStatusLabel(status) {
  return BOOKING_STATUSES.find((s) => s.value === status)?.label || status;
}
const fadeUp = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Shell = styled.div`
  height: 100dvh;
  height: 100vh;
  overflow: hidden;
  --portal-header-h: 4.25rem;
  --portal-footer-h: ${({ $hasFooter }) => ($hasFooter ? '3.25rem' : '0px')};
  position: relative;
`;

const TopBar = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  min-height: var(--portal-header-h);
  box-sizing: border-box;
  background: ${({ theme }) => theme.colors.headerBg};
  color: ${({ theme }) => theme.colors.headerText};
  border-bottom: 1px solid ${({ theme }) => theme.colors.headerBorder};
  transition:
    background ${({ theme }) => theme.transitions.base},
    color ${({ theme }) => theme.transitions.base},
    border-color ${({ theme }) => theme.transitions.base};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => `${theme.space[4]} ${theme.space[6]}`};
  }
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  color: ${({ theme }) => theme.colors.headerText};
  letter-spacing: -0.02em;
  flex-shrink: 0;
  justify-self: start;
  line-height: 1.2;
  white-space: nowrap;
  transition: color ${({ theme }) => theme.transitions.base};

  span {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const HeaderEnd = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[3]};
  justify-self: end;
  min-width: 0;
`;

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  flex-shrink: 0;
`;

const HeaderIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.headerIconBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  background: transparent;
  color: ${({ theme }) => theme.colors.headerText};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.headerIconHover};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const TitleMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.headerMuted};
  text-align: right;
  min-width: 0;

  strong {
    color: ${({ theme }) => theme.colors.headerText};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
`;

const StickyActions = styled.footer`
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
  min-height: var(--portal-footer-h);
  box-sizing: border-box;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.md};

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => `${theme.space[2]} ${theme.space[6]}`};
  }
`;

const StickyHint = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  min-width: 12rem;
`;

const StickyButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  justify-content: flex-end;
`;

const MainScroll = styled.div`
  position: absolute;
  top: var(--portal-header-h);
  bottom: var(--portal-footer-h);
  left: 0;
  right: 0;
  overflow: hidden;
`;

const Main = styled.main`
  width: min(1280px, 100%);
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space[6]} ${theme.space[4]}`};
  animation: ${fadeUp} 400ms ease;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    padding-left: calc(220px + ${({ theme }) => theme.space[6]} + ${({ theme }) => theme.space[4]});
    padding-right: ${({ $adminPreview, theme }) =>
      $adminPreview
        ? 'calc(260px + ' + theme.space[6] + ' + ' + theme.space[4] + ')'
        : theme.space[4]};
  }
`;

const ContentLayout = styled.div`
  min-width: 0;
`;

const FormColumn = styled.div`
  min-width: 0;
`;

const FixedAside = styled.aside`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: calc(var(--portal-header-h) + ${({ theme }) => theme.space[4]});
    bottom: calc(var(--portal-footer-h) + ${({ theme }) => theme.space[4]});
    width: ${({ $side }) => ($side === 'left' ? '220px' : '260px')};
    z-index: ${({ theme }) => theme.zIndex.sticky - 1};
    overflow: hidden;

    /* Align with the centered 1280px content column */
    left: ${({ $side, theme }) =>
      $side === 'left'
        ? 'max(' + theme.space[4] + ', calc(50% - 640px + ' + theme.space[4] + '))'
        : 'auto'};
    right: ${({ $side, theme }) =>
      $side === 'right'
        ? 'max(' + theme.space[4] + ', calc(50% - 640px + ' + theme.space[4] + '))'
        : 'auto'};
  }
`;

const AsideScroll = styled.div`
  flex: 1;
  min-height: 0;
  height: 100%;
`;

const AsidePad = styled.div`
  padding-bottom: ${({ theme }) => theme.space[2]};
`;

const UnavailableCard = styled.div`
  width: min(480px, 100%);
  margin: 4rem auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.space[8]};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  text-align: center;
`;

const IntroCard = styled.div`
  margin-bottom: ${({ theme }) => theme.space[6]};
  padding: ${({ theme }) => theme.space[4]};
  background: ${({ theme }) => theme.colors.accentMuted};
  border: 1px solid ${({ theme }) => theme.colors.accent};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`;

const SuccessBanner = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.successMuted};
  border: 1px solid ${({ theme }) => theme.colors.success};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.success};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const FullScreenCenter = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[3]};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

export default function PortalPage() {
  const { token } = useParams();
  const { toast } = useToast();

  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(null);
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [pinError, setPinError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | pending | saving | saved | error
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loadedToken, setLoadedToken] = useState(token);

  const formRef = useRef(form);
  const dirtyRef = useRef(dirty);
  const revisionRef = useRef(0);
  const permissionsRef = useRef({});
  const editableRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const saveAgainRef = useRef(false);
  const saveProgressRef = useRef(null);

  // Reset portal UI when navigating to another token (avoid setState-in-effect).
  if (token !== loadedToken) {
    setLoadedToken(token);
    setLoading(true);
    setData(null);
    setForm(null);
    setUnavailable(null);
    setPinRequired(false);
    setPinError('');
    setDirty(false);
    setSaveStatus('idle');
    setSubmitted(false);
    setErrors({});
  }

  useUnsavedChanges(dirty);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const loadPortal = useCallback(async () => {
    const result = await portalRequest(`/api/portal/${token}`);
    setData(result);
    setForm({ ...result.booking });
    setDirty(false);
    revisionRef.current = 0;
    setSaveStatus('idle');
    setUnavailable(null);
    setPinRequired(false);
    setPinError('');
    return result;
  }, [token]);

  const applyRemoteUpdate = useCallback(
    (result, meta = {}) => {
      const wasEditable = editableRef.current;
      const nowEditable = !!result?.portal?.editable;
      const unlocked = !wasEditable && nowEditable;
      // Keep ref in sync before next poll (don't wait for render effect)
      editableRef.current = nowEditable;

      if (meta.softSync) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                files: result.files ?? prev.files,
                categoryStatuses: result.categoryStatuses ?? prev.categoryStatuses,
                recentActivity: result.recentActivity ?? prev.recentActivity,
                bookingStatus: result.bookingStatus ?? result.booking?.status ?? prev.bookingStatus,
                portal: result.portal ?? prev.portal,
                schedule: result.schedule ?? prev.schedule,
                sites: result.sites ?? prev.sites,
                permissions: result.permissions ?? prev.permissions,
              }
            : result
        );
        // Keep local edits; sync version + any fields the client cannot edit
        // (includes readonly rate card fields so admin rate saves apply live).
        setForm((prev) => {
          if (!prev || !result?.booking) return prev;
          const perms = result.permissions || permissionsRef.current || {};
          const next = { ...prev, current_version: result.booking.current_version };
          Object.keys(result.booking).forEach((key) => {
            if (key === 'current_version') return;
            if (canClientEdit(getFieldPermission(perms, key))) return;
            next[key] = result.booking[key];
          });
          // Always apply rate card from server (readonly; never client-edited).
          for (const key of ['half_day_rate', 'full_day_rate', 'rate_card_label']) {
            if (Object.prototype.hasOwnProperty.call(result.booking, key)) {
              next[key] = result.booking[key];
            }
          }
          // Extra-shots flag: apply from server unless the client has unsaved edits.
          if (
            !dirtyRef.current &&
            Object.prototype.hasOwnProperty.call(
              result.booking,
              'use_remaining_for_extra_shots'
            )
          ) {
            next.use_remaining_for_extra_shots = result.booking.use_remaining_for_extra_shots;
          }
          return next;
        });
        if (meta.allowToast && (unlocked || meta.filesChanged)) {
          if (unlocked) toast('Editing unlocked — you can make changes again');
          else if (meta.filesChanged) toast('Files updated');
        }
        return;
      }

      setData(result);
      setForm({ ...result.booking });
      setDirty(false);
      revisionRef.current = 0;
      setSaveStatus('idle');
      if (meta.allowToast && (unlocked || meta.meaningful !== false)) {
        if (unlocked) toast('Editing unlocked — you can make changes again');
        else if (meta.filesChanged && !meta.versionChanged) toast('Files updated');
        else if (meta.meaningful || meta.versionChanged) toast('Booking updated');
      }
    },
    [toast]
  );

  const localFingerprint = useMemo(
    () =>
      bookingSyncFingerprint({
        booking: form,
        files: data?.files,
        categoryStatuses: data?.categoryStatuses,
        schedule: data?.schedule,
        sites: data?.sites,
        permissions: data?.permissions,
        portal: data?.portal,
      }),
    [form, data]
  );

  usePortalRemoteSync({
    token,
    enabled: !!data && !loading && !pinRequired && !unavailable,
    localFingerprint,
    dirty,
    saving: saveStatus === 'saving',
    onRemoteUpdate: applyRemoteUpdate,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await portalRequest(`/api/portal/${token}`);
        if (cancelled) return;
        setData(result);
        setForm({ ...result.booking });
        setDirty(false);
        revisionRef.current = 0;
        setSaveStatus('idle');
        setUnavailable(null);
        setPinRequired(false);
        setPinError('');
      } catch (err) {
        if (cancelled) return;
        if (err.code === 'PIN_REQUIRED' || err.extra?.pinRequired || err.code === 'PIN_LOCKED') {
          setPinRequired(true);
          setUnavailable(null);
          setData(null);
          setForm(null);
          setPinError(err.code === 'PIN_LOCKED' ? err.message : '');
        } else {
          setPinRequired(false);
          setUnavailable({
            message: err.message || 'This link is not valid.',
            code: err.code,
          });
          setData(null);
          setForm(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const unlockWithPin = async (e) => {
    e.preventDefault();
    setUnlocking(true);
    setPinError('');
    try {
      await portalRequest(`/api/portal/${token}`, {
        method: 'POST',
        body: { action: 'unlock', pin },
      });
      setPin('');
      setLoading(true);
      await loadPortal();
      toast('Portal unlocked');
    } catch (err) {
      setPinError(err.message || 'Incorrect PIN');
    } finally {
      setUnlocking(false);
      setLoading(false);
    }
  };

  const permissions = useMemo(
    () => data?.permissions || EMPTY_PERMISSIONS,
    [data?.permissions]
  );
  const editable = data?.viewerIsAdmin ? true : data?.portal?.editable;

  useEffect(() => {
    permissionsRef.current = permissions;
  }, [permissions]);

  useEffect(() => {
    editableRef.current = !!editable;
  }, [editable]);

  const { fieldHidden, fieldDisabled, fieldRequired } = useMemo(
    () => buildClientFieldState(permissions, !!editable),
    [permissions, editable]
  );

  const navSections = useMemo(() => {
    const sections = BOOKING_SECTIONS.map((section) => {
      const fields = section.fields.filter(
        (key) => key !== 'internal_notes' && key !== 'status' && key !== 'portal'
      );
      if (!fields.length) return null;
      if (!fields.some((key) => !fieldHidden[key])) return null;
      return {
        id: `portal-${section.key}`,
        label: section.label,
      };
    }).filter(Boolean);

    // Signed-in admins previewing the portal can see the calendar (clients cannot).
    if (data?.viewerIsAdmin) {
      const calendarNav = { id: 'portal-calendar', label: 'Calendar' };
      const scheduleIdx = sections.findIndex((s) => s.id === 'portal-schedule');
      if (scheduleIdx >= 0) sections.splice(scheduleIdx + 1, 0, calendarNav);
      else sections.push(calendarNav);
    }

    return sections;
  }, [fieldHidden, data?.viewerIsAdmin]);

  const onChange = (key, value) => {
    if (fieldDisabled[key] || fieldHidden[key]) return;
    revisionRef.current += 1;
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setSaveStatus('pending');
    setSubmitted(false);
  };

  const saveProgress = useCallback(
    async ({ silent = true } = {}) => {
      const current = formRef.current;
      if (!current || !editableRef.current) return true;
      if (!dirtyRef.current) return true;

      if (saveInFlightRef.current) {
        saveAgainRef.current = true;
        return false;
      }

      const revisionAtStart = revisionRef.current;
      const perms = permissionsRef.current;
      const payload = {};
      Object.keys(current).forEach((key) => {
        if (canClientEdit(getFieldPermission(perms, key))) {
          payload[key] = current[key];
        }
      });

      if (Object.keys(payload).length === 0) {
        setDirty(false);
        setSaveStatus('saved');
        return true;
      }

      saveInFlightRef.current = true;
      setSaveStatus('saving');
      setErrors({});

      try {
        const result = await portalRequest(`/api/portal/${token}/booking`, {
          method: 'PATCH',
          body: {
            action: 'save',
            data: payload,
            expected_version: current.current_version,
          },
        });

        const nextVersion =
          result?.booking?.current_version ?? result?.versionNumber ?? current.current_version;

        setForm((f) => {
          if (!f) return f;
          return { ...f, current_version: nextVersion };
        });

        if (Array.isArray(result?.recentActivity)) {
          setData((prev) =>
            prev ? { ...prev, recentActivity: result.recentActivity } : prev
          );
        }

        if (revisionRef.current === revisionAtStart) {
          setDirty(false);
          setSaveStatus('saved');
          return true;
        }

        setSaveStatus('pending');
        return false;
      } catch (err) {
        if (err.code === 'VERSION_CONFLICT' || err.status === 409) {
          try {
            const latest = await portalRequest(`/api/portal/${token}`);
            applyRemoteUpdate(latest, { softSync: true, allowToast: false });
            setForm((f) =>
              f && latest?.booking
                ? { ...f, current_version: latest.booking.current_version }
                : f
            );
            setSaveStatus('pending');
            toast('Remote changes detected — merging and retrying save', { variant: 'warning' });
            setTimeout(() => {
              if (dirtyRef.current) saveProgressRef.current?.({ silent: true });
            }, 250);
            return false;
          } catch {
            setSaveStatus('error');
            toast(err.message || 'Could not update the form', { variant: 'error' });
            return false;
          }
        }
        setSaveStatus('error');
        toast(err.message || 'Could not update the form', { variant: 'error' });
        return false;
      } finally {
        saveInFlightRef.current = false;
        if (saveAgainRef.current) {
          saveAgainRef.current = false;
          setTimeout(() => {
            if (dirtyRef.current) {
              saveProgressRef.current?.({ silent: true });
            }
          }, 0);
        }
      }
    },
    [token, toast, applyRemoteUpdate]
  );

  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  // Debounced auto-save after edits (pending status is set in onChange)
  useEffect(() => {
    if (!editable || !dirty || !form) return undefined;
    const timer = setTimeout(() => {
      saveProgress({ silent: true });
    }, 900);
    return () => clearTimeout(timer);
  }, [form, dirty, editable, saveProgress]);

  const flushPendingSave = useCallback(async () => {
    const waitIdle = async () => {
      for (let i = 0; i < 40; i += 1) {
        if (!saveInFlightRef.current) return;
        await new Promise((r) => setTimeout(r, 100));
      }
    };

    await waitIdle();
    if (!dirtyRef.current) return true;
    const ok = await saveProgress({ silent: true });
    await waitIdle();
    if (!ok && dirtyRef.current) {
      return saveProgress({ silent: true });
    }
    return !dirtyRef.current;
  }, [saveProgress]);

  const submitBooking = async () => {
    setSubmitting(true);
    try {
      const saved = await flushPendingSave();
      if (!saved && dirtyRef.current) {
        toast('Could not update the form — try again', { variant: 'error' });
        return;
      }
      await portalRequest(`/api/portal/${token}/booking`, {
        method: 'PATCH',
        body: { action: 'submit' },
      });
      setSubmitted(true);
      toast('Submitted successfully. You can still edit using this same link.');
      await loadPortal();
    } catch (err) {
      if (err.extra?.errors) {
        const map = {};
        err.extra.errors.forEach((e) => {
          map[e.field] = e.message;
        });
        setErrors(map);
      }
      toast(err.message, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FullScreenCenter role="status" aria-live="polite">
        <Spinner /> Loading your form…
      </FullScreenCenter>
    );
  }

  if (pinRequired && !form) {
    return (
      <Shell>
        <UnavailableCard>
          <h1 style={{ marginTop: 0 }}>Enter PIN</h1>
          <Muted>
            This booking link is protected. Enter the PIN you received from your contact.
          </Muted>
          <form onSubmit={unlockWithPin}>
            <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
              <Input
                label="PIN"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                error={pinError}
                required
                placeholder="Enter PIN"
              />
            </div>
            <Button type="submit" loading={unlocking} style={{ width: '100%' }}>
              {unlocking ? 'Checking…' : 'Continue'}
            </Button>
          </form>
        </UnavailableCard>
      </Shell>
    );
  }

  if (unavailable) {
    return (
      <Shell>
        <UnavailableCard>
          <h1 style={{ marginTop: 0 }}>Link unavailable</h1>
          <Muted>{unavailable.message}</Muted>
          {unavailable.code === 'INVALID_TOKEN' && (
            <p style={{ fontSize: '0.875rem' }}>
              Please check the link you received or contact your JCD contact for a new one.
            </p>
          )}
        </UnavailableCard>
      </Shell>
    );
  }

  if (!form) {
    return (
      <Shell>
        <EmptyState>Unable to load the form.</EmptyState>
      </Shell>
    );
  }

  const readOnly = !editable;
  const showRecentUpdates = !!data?.viewerIsAdmin;
  const displayName =
    data.displayName || form.campaign_name || form.client_company || form.sb_number;

  const titleBadges = (
    <>
      <strong>{displayName}</strong>
      {(data.bookingStatus || form.status) && (
        <Badge $tone={bookingStatusTone(data.bookingStatus || form.status)}>
          {bookingStatusLabel(data.bookingStatus || form.status)}
        </Badge>
      )}
      <Badge $tone={readOnly ? 'warning' : 'success'}>
        {readOnly ? 'Read-only' : 'Editable'}
      </Badge>
      {saveStatus === 'pending' && <Badge $tone="warning">Unsaved</Badge>}
      {saveStatus === 'saving' && <Badge $tone="info">Saving…</Badge>}
      {saveStatus === 'saved' && <Badge $tone="success">Saved</Badge>}
      {saveStatus === 'error' && <Badge $tone="danger">Update failed</Badge>}
    </>
  );

  return (
    <Shell $hasFooter={!readOnly}>
      <a href="#portal-form" className="skip-link">
        Skip to form
      </a>
      <TopBar>
        <Brand>
          MPC <span>Booking</span>
        </Brand>
        <HeaderEnd>
          <TitleMeta>{titleBadges}</TitleMeta>
          <HeaderActions>
            <HeaderIconBtn
              type="button"
              aria-label="Refresh form"
              title="Refresh form"
              onClick={async () => {
                if (dirty && !window.confirm('You have unsaved changes. Refresh and discard them?')) {
                  return;
                }
                try {
                  setLoading(true);
                  await loadPortal();
                  toast('Form refreshed');
                } catch (err) {
                  toast(err.message || 'Could not refresh', { variant: 'error' });
                } finally {
                  setLoading(false);
                }
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 12a9 9 0 1 1-2.5-6.1"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <path
                  d="M21 4v5h-5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </HeaderIconBtn>
            <HelpGuideButton variant="portal" />
            <ThemeToggle variant="header" />
          </HeaderActions>
        </HeaderEnd>
      </TopBar>

      <FixedAside $side="left" aria-label="Form navigation">
        <AsideScroll>
          <ScrollArea type="scroll">
            <AsidePad>
              <RateCardPanel
                values={form}
                scheduleEntries={shootRequirementsFromSchedule(data.schedule)}
                onChange={onChange}
                readOnly={readOnly}
                editableRates={false}
                showExtraShots={!fieldHidden.use_remaining_for_extra_shots}
                extraShotsDisabled={readOnly || fieldDisabled.use_remaining_for_extra_shots}
              />
              <div style={{ height: '0.75rem' }} />
              <PortalSectionNav sections={navSections} />
            </AsidePad>
          </ScrollArea>
        </AsideScroll>
      </FixedAside>

      {showRecentUpdates && (
        <FixedAside $side="right" aria-label="Recent updates">
          <AsideScroll>
            <ScrollArea type="scroll">
              <AsidePad>
                <PortalRecentUpdates
                  items={data.recentActivity || []}
                  hint="Live client changes on this booking"
                  empty="No client updates yet. Changes from the portal will appear here."
                />
              </AsidePad>
            </ScrollArea>
          </AsideScroll>
        </FixedAside>
      )}

      <MainScroll>
        <ScrollArea type="hover">
          <Main id="portal-form" $adminPreview={showRecentUpdates}>
            <ContentLayout>
              <FormColumn>
                {readOnly && (
                  <IntroCard>
                    This portal is currently <strong>read-only</strong>. You can view the form but
                    cannot save changes until an admin unlocks editing.
                  </IntroCard>
                )}

                {!readOnly && (
                  <IntroCard>
                    Fill in the sections below, then use <strong>Submit</strong> when you are ready
                    for review. Required fields are marked with *.
                  </IntroCard>
                )}

                {submitted && (
                  <SuccessBanner role="status">
                    Your changes were submitted for review. You can keep editing using this same
                    link.
                  </SuccessBanner>
                )}

            <CampaignDetailsSection
              id="portal-campaign"
              values={form}
              onChange={onChange}
              errors={errors}
              readOnly={readOnly}
              fieldDisabled={{ ...fieldDisabled, budget_required: true }}
              fieldHidden={fieldHidden}
              fieldRequired={fieldRequired}
              scheduleEntries={shootRequirementsFromSchedule(data.schedule)}
              poFiles={
                !fieldHidden.files ? (
                  <PoDocumentUploader
                    bookingId={form.id}
                    files={data.files}
                    onRefresh={loadPortal}
                    readOnly={readOnly || fieldDisabled.files}
                    isAdmin={false}
                    portalToken={token}
                  />
                ) : null
              }
            />

            <ContactInformationSection
              id="portal-contact"
              values={form}
              onChange={onChange}
              errors={errors}
              readOnly={readOnly}
              fieldDisabled={fieldDisabled}
              fieldHidden={fieldHidden}
              fieldRequired={fieldRequired}
            />

            {!fieldHidden.schedule && (
              <ShootRequirementsSection
                id="portal-schedule"
                booking={form}
                entries={shootRequirementsFromSchedule(data.schedule)}
                readOnly={readOnly || fieldDisabled.schedule}
                showCalendarHint={false}
                showDeliveryDate={false}
                onAdd={async (entry) => {
                  await portalRequest(`/api/portal/${token}/booking`, {
                    method: 'PATCH',
                    body: { action: 'add_schedule', data: entry },
                  });
                  toast('Shoot day added');
                  await loadPortal();
                }}
                onUpdate={async (entry) => {
                  await portalRequest(`/api/portal/${token}/booking`, {
                    method: 'PATCH',
                    body: { action: 'update_schedule', ...entry },
                  });
                  toast('Shoot day updated');
                  await loadPortal();
                }}
                onRemove={async (entryId) => {
                  await portalRequest(`/api/portal/${token}/booking`, {
                    method: 'PATCH',
                    body: { action: 'remove_schedule', entryId },
                  });
                  await loadPortal();
                }}
              />
            )}

            {showRecentUpdates && (
              <CalendarSection
                id="portal-calendar"
                entries={data.schedule || []}
                readOnly
              />
            )}

            <DeliverablesSection
              id="portal-deliverables"
              values={form}
              onChange={onChange}
              errors={errors}
              readOnly={readOnly}
              fieldDisabled={fieldDisabled}
              fieldHidden={fieldHidden}
              fieldRequired={fieldRequired}
              scheduleEntries={shootRequirementsFromSchedule(data.schedule)}
              filesSlot={
                !fieldHidden.files ? (
                  <FilesSection
                    bookingId={form.id}
                    files={data.files}
                    categoryStatuses={data.categoryStatuses}
                    onRefresh={loadPortal}
                    readOnly={readOnly || fieldDisabled.files}
                    isAdmin={false}
                    portalToken={token}
                    categories={DELIVERABLE_FILE_CATEGORIES}
                    title="Files"
                    hideChrome
                  />
                ) : null
              }
            />

            </FormColumn>
            </ContentLayout>
          </Main>
        </ScrollArea>
      </MainScroll>

      {!readOnly && (
        <StickyActions>
          <StickyHint>
            {saveStatus === 'error'
              ? 'Something went wrong — edit a field and try Submit again.'
              : 'Submit when the form is ready for review.'}
          </StickyHint>
          <StickyButtons>
            <Button onClick={submitBooking} loading={submitting} disabled={submitting}>
              Submit
            </Button>
          </StickyButtons>
        </StickyActions>
      )}
    </Shell>
  );
}
