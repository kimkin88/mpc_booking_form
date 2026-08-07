import { createServiceClient } from '@/lib/supabase/admin';
import { notifyClient, notifyBookingOwner } from '@/services/notificationService';
import { logActivity } from '@/services/activityService';
import { getBooking } from '@/services/bookingService';
import { clientDisplayName } from '@/utils/helpers';

const MAX_BODY = 4000;

export function normalizeMessageBody(raw) {
  const body = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!body) return { error: 'Message cannot be empty' };
  if (body.length > MAX_BODY) return { error: `Message must be under ${MAX_BODY} characters` };
  return { body };
}

function mapMessage(row) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    sender_role: row.sender_role,
    sender_id: row.sender_id || null,
    sender_name: row.sender_name || null,
    body: row.body,
    read_by_admin_at: row.read_by_admin_at || null,
    read_by_client_at: row.read_by_client_at || null,
    created_at: row.created_at,
  };
}

export async function listBookingMessages(bookingId, { limit = 200 } = {}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('booking_messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })
    .limit(Math.min(Math.max(Number(limit) || 200, 1), 500));

  if (error) throw new Error(error.message);
  return (data || []).map(mapMessage);
}

export async function countUnreadForAdmin(bookingId = null) {
  const supabase = createServiceClient();
  let query = supabase
    .from('booking_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_role', 'client')
    .is('read_by_admin_at', null);
  if (bookingId) query = query.eq('booking_id', bookingId);
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function countUnreadForClient(bookingId) {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from('booking_messages')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId)
    .eq('sender_role', 'admin')
    .is('read_by_client_at', null);
  if (error) throw new Error(error.message);
  return count || 0;
}

/** Admin inbox: one row per booking that has a portal, with latest message when any. */
export async function listAdminMessageThreads({ limit = 200 } = {}) {
  const supabase = createServiceClient();

  const { data: portals, error: portalsError } = await supabase
    .from('portal_access')
    .select(
      `
      id,
      booking_id,
      status,
      created_at,
      bookings!inner (
        id,
        sb_number,
        campaign_name,
        client_name,
        client_company,
        client_email
      )
    `
    )
    .order('created_at', { ascending: false });

  if (portalsError) throw new Error(portalsError.message);

  // Newest portal row wins when a booking has more than one.
  const portalByBooking = new Map();
  for (const row of portals || []) {
    if (!portalByBooking.has(row.booking_id)) {
      portalByBooking.set(row.booking_id, row);
    }
  }

  const bookingIds = [...portalByBooking.keys()];
  if (!bookingIds.length) return [];

  const [{ data: messages, error: messagesError }, { data: unreadRows, error: unreadError }] =
    await Promise.all([
      supabase
        .from('booking_messages')
        .select('id, booking_id, sender_role, sender_name, body, created_at, read_by_admin_at')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('booking_messages')
        .select('booking_id')
        .in('booking_id', bookingIds)
        .eq('sender_role', 'client')
        .is('read_by_admin_at', null),
    ]);

  if (messagesError) throw new Error(messagesError.message);
  if (unreadError) throw new Error(unreadError.message);

  const latestByBooking = new Map();
  for (const row of messages || []) {
    if (!latestByBooking.has(row.booking_id)) {
      latestByBooking.set(row.booking_id, row);
    }
  }

  const unreadMap = new Map();
  for (const row of unreadRows || []) {
    unreadMap.set(row.booking_id, (unreadMap.get(row.booking_id) || 0) + 1);
  }

  const threads = bookingIds.map((id) => {
    const portal = portalByBooking.get(id);
    const booking = portal?.bookings || {};
    const latest = latestByBooking.get(id);
    return {
      booking_id: id,
      portal_id: portal?.id || null,
      portal_status: portal?.status || null,
      sb_number: booking.sb_number || null,
      campaign_name: booking.campaign_name || null,
      client_label:
        clientDisplayName(booking) || booking.campaign_name || booking.sb_number || 'Booking',
      latest_message: latest ? mapMessage(latest) : null,
      unread_count: unreadMap.get(id) || 0,
      portal_created_at: portal?.created_at || null,
    };
  });

  threads.sort((a, b) => {
    const aUnread = a.unread_count > 0 ? 1 : 0;
    const bUnread = b.unread_count > 0 ? 1 : 0;
    if (bUnread !== aUnread) return bUnread - aUnread;
    const aTime = a.latest_message?.created_at || a.portal_created_at || '';
    const bTime = b.latest_message?.created_at || b.portal_created_at || '';
    return String(bTime).localeCompare(String(aTime));
  });

  return threads.slice(0, Math.min(Math.max(Number(limit) || 200, 1), 500));
}

export async function sendBookingMessage({
  bookingId,
  senderRole,
  senderId = null,
  senderName = null,
  body,
  requestMeta = {},
}) {
  const normalized = normalizeMessageBody(body);
  if (normalized.error) {
    const err = new Error(normalized.error);
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const row = {
    booking_id: bookingId,
    sender_role: senderRole,
    sender_id: senderId,
    sender_name: senderName,
    body: normalized.body,
    read_by_admin_at: senderRole === 'admin' ? now : null,
    read_by_client_at: senderRole === 'client' ? now : null,
  };

  const supabase = createServiceClient();
  const { data, error } = await supabase.from('booking_messages').insert(row).select('*').single();
  if (error) throw new Error(error.message);

  const message = mapMessage(data);
  const booking = await getBooking(bookingId);
  const label = clientDisplayName(booking || {}) || booking?.sb_number || 'Booking';

  try {
    await logActivity({
      bookingId,
      actorId: senderId,
      actorName: senderName || (senderRole === 'admin' ? 'Admin' : 'Client'),
      actorRole: senderRole === 'admin' ? 'admin' : 'client',
      action: 'message_sent',
      section: 'messages',
      source: senderRole === 'admin' ? 'admin_portal' : 'client_portal',
      metadata: { preview: normalized.body.slice(0, 120) },
      ...requestMeta,
    });
  } catch (err) {
    console.error('message activity log failed', err);
  }

  try {
    if (senderRole === 'client') {
      await notifyBookingOwner(
        booking,
        'client_message',
        'New client message',
        `${label}: ${normalized.body.slice(0, 140)}`,
        { messageId: message.id }
      );
    } else if (booking?.client_email) {
      await notifyClient(
        bookingId,
        booking.client_email,
        'admin_message',
        'New message from MPC',
        normalized.body.slice(0, 200),
        { messageId: message.id }
      );
    }
  } catch (err) {
    console.error('message notification failed', err);
  }

  return message;
}

export async function markBookingMessagesRead(bookingId, viewerRole) {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  if (viewerRole === 'admin') {
    const { error } = await supabase
      .from('booking_messages')
      .update({ read_by_admin_at: now })
      .eq('booking_id', bookingId)
      .eq('sender_role', 'client')
      .is('read_by_admin_at', null);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('booking_messages')
      .update({ read_by_client_at: now })
      .eq('booking_id', bookingId)
      .eq('sender_role', 'admin')
      .is('read_by_client_at', null);
    if (error) throw new Error(error.message);
  }

  return { ok: true };
}
