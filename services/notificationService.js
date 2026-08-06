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

/**
 * Resolve MPC booking owner profile (name match, then created_by).
 * @returns {Promise<{ id: string, full_name: string|null, email: string|null }|null>}
 */
export async function resolveBookingOwner(booking) {
  if (!booking) return null;
  const supabase = createServiceClient();
  const ownerName = String(booking.mpc_owner_name || '').trim();

  if (ownerName) {
    const { data: byName } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .ilike('full_name', ownerName)
      .limit(1)
      .maybeSingle();
    if (byName?.id) return byName;
  }

  if (booking.created_by) {
    const { data: byId } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', booking.created_by)
      .maybeSingle();
    if (byId?.id) return byId;
  }

  return null;
}

/**
 * In-app notify the MPC booking owner when possible; otherwise all admins.
 */
export async function notifyBookingOwner(booking, type, title, body, metadata = {}) {
  const owner = await resolveBookingOwner(booking);
  if (owner?.id) {
    return createNotification({
      bookingId: booking.id,
      recipientType: 'admin',
      recipientId: owner.id,
      type,
      title,
      body,
      metadata: { ...metadata, ownerName: owner.full_name || booking.mpc_owner_name || null },
    });
  }
  return notifyAdmins(booking.id, type, title, body, {
    ...metadata,
    ownerFallback: true,
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

export async function listAdminNotifications({
  limit = 50,
  unreadOnly = false,
  adminId = null,
} = {}) {
  const supabase = createServiceClient();
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_type', 'admin')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (adminId) {
    query = query.or(`recipient_id.is.null,recipient_id.eq.${adminId}`);
  }

  if (unreadOnly) query = query.is('read_at', null);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function countUnreadAdminNotifications(adminId = null) {
  const supabase = createServiceClient();
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_type', 'admin')
    .is('read_at', null);

  if (adminId) {
    query = query.or(`recipient_id.is.null,recipient_id.eq.${adminId}`);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function markAllAdminNotificationsRead(adminId = null) {
  const supabase = createServiceClient();
  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_type', 'admin')
    .is('read_at', null);

  if (adminId) {
    query = query.or(`recipient_id.is.null,recipient_id.eq.${adminId}`);
  }

  return query;
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
