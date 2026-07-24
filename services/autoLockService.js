import { createServiceClient } from '@/lib/supabase/admin';
import { buildPortalUrl } from '@/lib/crypto';
import { sendEmail } from '@/lib/email';
import { isAutoLockEnabled, todayDateOnly } from '@/lib/portalAutomation';
import { logActivity } from '@/services/activityService';
import { notifyAdmins, notifyClient } from '@/services/notificationService';
import { formatDate } from '@/utils/format';

/**
 * Auto-lock a single booking portal (read-only). Idempotent if already locked/disabled.
 */
export async function autoLockBookingPortal(bookingId, { lockDate = null } = {}) {
  const supabase = createServiceClient();

  const { data: portal, error: portalError } = await supabase
    .from('portal_access')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (portalError) throw portalError;
  if (!portal) return { skipped: true, reason: 'no_portal' };
  if (portal.status === 'disabled') return { skipped: true, reason: 'disabled' };
  if (portal.manual_unlock === true) {
    return { skipped: true, reason: 'manual_unlock' };
  }
  if (portal.status === 'locked' && portal.editing_locked) {
    return { skipped: true, reason: 'already_locked' };
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();
  if (bookingError) throw bookingError;
  if (!isAutoLockEnabled(booking)) {
    return { skipped: true, reason: 'auto_lock_disabled' };
  }

  const previous = {
    status: portal.status,
    editing_locked: portal.editing_locked,
    manual_unlock: portal.manual_unlock,
  };
  const { data: updated, error } = await supabase
    .from('portal_access')
    .update({ status: 'locked', editing_locked: true, manual_unlock: false })
    .eq('id', portal.id)
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    bookingId,
    actorName: 'System',
    actorRole: 'system',
    action: 'portal_automatically_locked',
    section: 'portal',
    previousValue: previous,
    newValue: {
      status: 'locked',
      editing_locked: true,
      lock_date: lockDate || booking.portal_lock_date,
    },
    source: 'system',
  });

  const lockLabel = formatDate(lockDate || booking.portal_lock_date);
  const emails = [
    booking.client_email,
    booking.jcd_contact_email,
    ...(booking.cc_emails || []),
  ]
    .map((e) => String(e || '').trim().toLowerCase())
    .filter(Boolean);

  const portalUrl = portal.access_token ? buildPortalUrl(portal.access_token) : null;
  const subject = `${booking.sb_number || 'Booking'} portal is now read-only`;
  const body = [
    `The client portal for ${booking.sb_number || 'this booking'} is now read-only`,
    lockLabel ? `(lock date ${lockLabel}).` : '.',
    portalUrl ? `You can still view the booking here: ${portalUrl}` : '',
    `Contact MPC if you need an extension.`,
  ]
    .filter(Boolean)
    .join(' ');

  for (const email of [...new Set(emails)]) {
    await notifyClient(bookingId, email, 'booking_updated_by_admin', subject, body, {
      autoLock: true,
      lockDate: lockDate || booking.portal_lock_date,
    });
    await sendEmail({ to: email, subject, text: body });
  }

  await notifyAdmins(
    bookingId,
    'client_updated_booking',
    'Portal auto-locked',
    `${booking.sb_number} portal was automatically locked${lockLabel ? ` on ${lockLabel}` : ''}.`,
    { autoLock: true }
  );

  return { ok: true, portal: updated };
}

/**
 * Lock all portals whose portal_lock_date is today or earlier.
 */
export async function processDueAutoLocks({ now = new Date() } = {}) {
  const supabase = createServiceClient();
  const today = todayDateOnly(now);

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, portal_lock_date, auto_lock_enabled, status')
    .not('portal_lock_date', 'is', null)
    .lte('portal_lock_date', today);

  if (error) throw error;

  const results = [];
  for (const booking of bookings || []) {
    if (['archived', 'cancelled'].includes(booking.status)) continue;
    if (!isAutoLockEnabled(booking)) {
      results.push({ bookingId: booking.id, skipped: true, reason: 'auto_lock_disabled' });
      continue;
    }
    try {
      const result = await autoLockBookingPortal(booking.id, {
        lockDate: String(booking.portal_lock_date).slice(0, 10),
      });
      results.push({ bookingId: booking.id, ...result });
    } catch (err) {
      results.push({ bookingId: booking.id, ok: false, error: err.message });
    }
  }

  return { today, results };
}

/**
 * Lazy enforcement when a client opens the portal: lock if due.
 */
export async function enforceAutoLockIfDue(booking, portal) {
  if (!booking || !portal) return portal;
  if (portal.manual_unlock === true) return portal;
  if (!isAutoLockEnabled(booking)) return portal;
  if (!booking.portal_lock_date) return portal;
  if (portal.status === 'disabled' || portal.status === 'locked') return portal;

  const today = todayDateOnly();
  const lockDate = String(booking.portal_lock_date).slice(0, 10);
  if (lockDate > today) return portal;

  const result = await autoLockBookingPortal(booking.id, { lockDate });
  if (result.skipped) return portal;
  if (result.portal) return result.portal;
  return { ...portal, status: 'locked', editing_locked: true, manual_unlock: false };
}
