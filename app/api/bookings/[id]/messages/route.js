import { requireAdmin, jsonOk, jsonError, jsonCreated, getRequestMeta } from '@/lib/api';
import {
  listBookingMessages,
  sendBookingMessage,
  markBookingMessagesRead,
  countUnreadForAdmin,
} from '@/services/messageService';
import { getBooking } from '@/services/bookingService';

export async function GET(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const booking = await getBooking(id);
    if (!booking) return jsonError('Booking not found', 404);

    const [messages, unread] = await Promise.all([
      listBookingMessages(id),
      countUnreadForAdmin(id),
    ]);

    return jsonOk({ messages, unread });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const booking = await getBooking(id);
    if (!booking) return jsonError('Booking not found', 404);

    const payload = await request.json();
    const meta = getRequestMeta(request);
    const message = await sendBookingMessage({
      bookingId: id,
      senderRole: 'admin',
      senderId: auth.user?.id || null,
      senderName: auth.actor?.name || auth.profile?.full_name || auth.user?.email || 'Admin',
      body: payload?.body,
      requestMeta: meta,
    });

    return jsonCreated(message);
  } catch (err) {
    return jsonError(err.message, err.status || 500);
  }
}

export async function PATCH(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const booking = await getBooking(id);
    if (!booking) return jsonError('Booking not found', 404);

    await markBookingMessagesRead(id, 'admin');
    return jsonOk({ unread: 0 });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
