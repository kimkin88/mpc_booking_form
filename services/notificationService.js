import { createServiceClient } from '@/lib/supabase/admin';
import { logActivity } from '@/services/activityService';
import { clientDisplayName } from '@/utils/helpers';

/**
 * In-app notifications. Email delivery is stubbed — store for admin UI.
 * Assumption: notifications are persisted in-app; email sending can be wired
 * to a provider later without changing the schema.
 */
export async function createNotification({
  bookingId,
  recipientType,
  recipientId = null,
  recipientEmail = null,
  type,
  title,
  body,
  metadata = {},
}) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      booking_id: bookingId,
      recipient_type: recipientType,
      recipient_id: recipientId,
      recipient_email: recipientEmail,
      type,
      title,
      body,
      metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return null;
  }

  return data;
}

export async function notifyAdmins(bookingId, type, title, body, metadata = {}) {
  return createNotification({
    bookingId,
    recipientType: 'admin',
    type,
    title,
    body,
    metadata,
  });
}

export async function notifyClient(bookingId, email, type, title, body, metadata = {}) {
  return createNotification({
    bookingId,
    recipientType: 'client',
    recipientEmail: email,
    type,
    title,
    body,
    metadata,
  });
}

export async function markNotificationRead(id) {
  const supabase = createServiceClient();
  return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

export async function listAdminNotifications({ limit = 50, unreadOnly = false } = {}) {
  const supabase = createServiceClient();
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_type', 'admin')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.is('read_at', null);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function countUnreadAdminNotifications() {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_type', 'admin')
    .is('read_at', null);
  if (error) throw error;
  return count || 0;
}

export async function markAllAdminNotificationsRead() {
  const supabase = createServiceClient();
  return supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_type', 'admin')
    .is('read_at', null);
}

/**
 * Notify admins that a client opened the portal for the first time.
 */
export async function onPortalFirstOpen(booking, portal) {
  if (portal.first_opened_at) return;

  const who = clientDisplayName(booking);

  await notifyAdmins(
    booking.id,
    'client_opened_portal',
    'Client opened portal',
    `${who} opened the portal for ${booking.sb_number} (${booking.campaign_name || booking.client_company || 'Untitled'}).`
  );

  await logActivity({
    bookingId: booking.id,
    actorName: who,
    actorRole: 'client',
    action: 'portal_opened',
    section: 'portal',
    source: 'client_portal',
  });
}
