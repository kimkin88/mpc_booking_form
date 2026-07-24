import { createServiceClient } from '@/lib/supabase/admin';
import { buildPortalUrl } from '@/lib/crypto';
import { sendEmail } from '@/lib/email';
import {
  detectMissingFields,
  formatMissingItemsList,
} from '@/lib/missingFields';
import {
  daysUntil,
  getReminderOffsetsDays,
  isAutoLockEnabled,
  reminderTypeForOffset,
  todayDateOnly,
} from '@/lib/portalAutomation';
import { logActivity } from '@/services/activityService';
import { notifyAdmins, notifyClient } from '@/services/notificationService';
import { formatDate } from '@/utils/format';

function recipientEmailsForBooking(booking) {
  const emails = new Set();
  if (booking.client_email) emails.add(String(booking.client_email).trim().toLowerCase());
  if (booking.jcd_contact_email) {
    emails.add(String(booking.jcd_contact_email).trim().toLowerCase());
  }
  for (const cc of booking.cc_emails || []) {
    if (cc) emails.add(String(cc).trim().toLowerCase());
  }
  return [...emails].filter(Boolean);
}

function buildReminderEmail({ booking, portalUrl, lockDate, missing }) {
  const ref = booking.sb_number || 'Booking';
  const campaign = booking.campaign_name || booking.brand || 'your campaign';
  const lockLabel = lockDate ? formatDate(lockDate) : 'soon';
  const list = formatMissingItemsList(missing);

  const subject = `Action needed: complete ${ref} before portal locks on ${lockLabel}`;
  const text = [
    `Hello,`,
    ``,
    `This is a reminder to complete the booking form for ${ref} (${campaign}).`,
    ``,
    `Portal lock date: ${lockLabel}`,
    `After this date the portal becomes read-only.`,
    ``,
    `Missing items:`,
    list,
    ``,
    portalUrl ? `Complete your booking here:\n${portalUrl}` : `Open your secure portal link to continue.`,
    ``,
    `If you need help, contact your MPC booking owner.`,
    ``,
    `— MPC Bookings (no-reply)`,
  ].join('\n');

  const html = `
    <p>Hello,</p>
    <p>This is a reminder to complete the booking form for <strong>${escapeHtml(ref)}</strong>
    (${escapeHtml(campaign)}).</p>
    <p><strong>Portal lock date:</strong> ${escapeHtml(lockLabel)}<br/>
    After this date the portal becomes read-only.</p>
    <p><strong>Missing items:</strong></p>
    <pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(list)}</pre>
    ${
      portalUrl
        ? `<p><a href="${escapeHtml(portalUrl)}">Complete your booking</a></p>`
        : '<p>Open your secure portal link to continue.</p>'
    }
    <p>If you need help, contact your MPC booking owner.</p>
    <p style="color:#666">— MPC Bookings (no-reply)</p>
  `;

  return { subject, text, html };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadBookingBundle(bookingId) {
  const supabase = createServiceClient();
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();
  if (error) throw error;

  const [{ data: schedule }, { data: files }, { data: categoryStatuses }, { data: portal }] =
    await Promise.all([
      supabase.from('schedule_entries').select('*').eq('booking_id', bookingId),
      supabase
        .from('file_assets')
        .select('id, category, is_removed')
        .eq('booking_id', bookingId),
      supabase.from('file_category_statuses').select('*').eq('booking_id', bookingId),
      supabase.from('portal_access').select('*').eq('booking_id', bookingId).maybeSingle(),
    ]);

  return {
    booking,
    schedule: schedule || [],
    files: files || [],
    categoryStatuses: categoryStatuses || [],
    portal,
  };
}

async function alreadySent(bookingId, reminderType, lockDate) {
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from('booking_reminders')
    .select('id, metadata, delivery_status')
    .eq('booking_id', bookingId)
    .eq('reminder_type', reminderType)
    .in('delivery_status', ['sent', 'stubbed']);
  if (error) throw error;
  const lockKey = lockDate ? String(lockDate).slice(0, 10) : null;
  return (rows || []).some(
    (r) => !lockKey || String(r.metadata?.lock_date || '').slice(0, 10) === lockKey
  );
}

/**
 * Send a missing-fields reminder for one booking.
 */
export async function sendMissingFieldsReminder({
  bookingId,
  reminderType = 'manual',
  force = false,
  actor = { id: null, name: 'System', role: 'system' },
  source = 'system',
} = {}) {
  const bundle = await loadBookingBundle(bookingId);
  const { booking, schedule, files, categoryStatuses, portal } = bundle;
  const lockDate = booking.portal_lock_date
    ? String(booking.portal_lock_date).slice(0, 10)
    : null;

  if (!force && reminderType !== 'manual') {
    const dup = await alreadySent(bookingId, reminderType, lockDate);
    if (dup) {
      return { skipped: true, reason: 'already_sent', bookingId, reminderType };
    }
  }

  const missing = detectMissingFields({ booking, schedule, files, categoryStatuses });
  if (!missing.length && reminderType !== 'manual') {
    const row = await insertReminderRow({
      bookingId,
      reminderType,
      recipients: [],
      missing,
      deliveryStatus: 'skipped_complete',
      lockDate,
      metadata: { reason: 'no_missing_fields' },
    });
    return { skipped: true, reason: 'complete', reminder: row, missing };
  }

  // Manual resend with nothing missing still notifies that booking is complete
  const recipients = recipientEmailsForBooking(booking);
  if (!recipients.length) {
    const row = await insertReminderRow({
      bookingId,
      reminderType,
      recipients: [],
      missing,
      deliveryStatus: 'skipped_no_email',
      lockDate,
      errorMessage: 'No client/JCD/CC emails on booking',
    });
    await notifyAdmins(
      bookingId,
      'reminder_failed',
      'Reminder could not be sent',
      `${booking.sb_number}: no recipient emails for missing-fields reminder.`,
      { reminderType, missing }
    );
    return { ok: false, reason: 'no_email', reminder: row, missing };
  }

  const portalUrl = portal?.access_token ? buildPortalUrl(portal.access_token) : null;
  const mail = buildReminderEmail({ booking, portalUrl, lockDate, missing });
  const result = await sendEmail({
    to: recipients,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  const deliveryStatus = result.ok
    ? result.skipped
      ? 'stubbed'
      : 'sent'
    : 'failed';

  const row = await insertReminderRow({
    bookingId,
    reminderType,
    recipients,
    missing,
    deliveryStatus,
    lockDate,
    errorMessage: result.error || null,
    metadata: {
      provider: result.provider,
      provider_id: result.id || null,
      lock_date: lockDate,
    },
  });

  for (const email of recipients) {
    await notifyClient(
      bookingId,
      email,
      'admin_requested_info',
      mail.subject,
      mail.text,
      { reminderType, missing, lockDate, portalUrl }
    );
  }

  await logActivity({
    bookingId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role || 'system',
    action: deliveryStatus === 'failed' ? 'reminder_failed' : 'reminder_sent',
    section: 'portal',
    newValue: {
      reminderType,
      deliveryStatus,
      recipients,
      missing,
      lockDate,
    },
    source,
  });

  if (deliveryStatus === 'failed') {
    await notifyAdmins(
      bookingId,
      'reminder_failed',
      'Reminder failed',
      `${booking.sb_number}: ${result.error || 'email send failed'}`,
      { reminderType }
    );
  }

  return {
    ok: result.ok,
    reminder: row,
    missing,
    deliveryStatus,
    recipients,
  };
}

async function insertReminderRow({
  bookingId,
  reminderType,
  recipients,
  missing,
  deliveryStatus,
  lockDate,
  errorMessage = null,
  metadata = {},
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('booking_reminders')
    .insert({
      booking_id: bookingId,
      reminder_type: reminderType,
      scheduled_at: new Date().toISOString(),
      sent_at: ['sent', 'stubbed'].includes(deliveryStatus)
        ? new Date().toISOString()
        : null,
      recipient_emails: recipients,
      missing_items: missing,
      delivery_status: deliveryStatus,
      error_message: errorMessage,
      metadata: { lock_date: lockDate, ...metadata },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listRemindersForBooking(bookingId) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('booking_reminders')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Process due missing-field reminders for all bookings with a lock date.
 */
export async function processDueReminders({ now = new Date() } = {}) {
  const supabase = createServiceClient();
  const today = todayDateOnly(now);
  const offsets = getReminderOffsetsDays();

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, portal_lock_date, auto_lock_enabled, status')
    .not('portal_lock_date', 'is', null);

  if (error) throw error;

  const results = [];
  for (const booking of bookings || []) {
    if (['archived', 'cancelled'].includes(booking.status)) continue;
    if (!isAutoLockEnabled(booking)) continue;
    const lockDate = String(booking.portal_lock_date).slice(0, 10);
    const until = daysUntil(lockDate, now);
    if (until == null) continue;

    for (const offset of offsets) {
      if (until !== offset) continue;
      const reminderType = reminderTypeForOffset(offset);
      try {
        const result = await sendMissingFieldsReminder({
          bookingId: booking.id,
          reminderType,
          force: false,
        });
        results.push({ bookingId: booking.id, offset, today, ...result });
      } catch (err) {
        results.push({
          bookingId: booking.id,
          offset,
          ok: false,
          error: err.message,
        });
      }
    }
  }

  return { today, offsets, results };
}
