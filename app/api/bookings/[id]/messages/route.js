import { jsonOk, jsonError, jsonCreated, getRequestMeta } from '@/lib/api';
import { requireBookingAccess } from '@/lib/requireBookingAccess';
import {
  listBookingMessages,
  sendBookingMessage,
  markBookingMessagesRead,
  countUnreadForAdmin,
} from '@/services/messageService';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

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
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const payload = await request.json();
    const meta = getRequestMeta(request);
    const message = await sendBookingMessage({
      bookingId: id,
      senderRole: 'admin',
      senderId: gate.user?.id || null,
      senderName: gate.actor?.name || gate.profile?.full_name || gate.user?.email || 'Admin',
      body: payload?.body,
      requestMeta: meta,
    });

    return jsonCreated(message);
  } catch (err) {
    return jsonError(err.message, err.status || 500);
  }
}

export async function PATCH(_request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    await markBookingMessagesRead(id, 'admin');
    return jsonOk({ unread: 0 });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
