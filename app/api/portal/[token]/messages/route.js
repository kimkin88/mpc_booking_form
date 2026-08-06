import { jsonOk, jsonError, jsonCreated, getRequestMeta } from '@/lib/api';
import { requirePortalFromRequest } from '@/lib/portalApi';
import {
  listBookingMessages,
  sendBookingMessage,
  markBookingMessagesRead,
  countUnreadForClient,
} from '@/services/messageService';
import { clientDisplayName } from '@/utils/helpers';

export async function GET(_request, { params }) {
  try {
    const { token } = await params;
    const gate = await requirePortalFromRequest(token, { recordAccess: false });
    if (gate.error) return gate.error;

    const bookingId = gate.resolved.booking.id;
    const [messages, unread] = await Promise.all([
      listBookingMessages(bookingId),
      countUnreadForClient(bookingId),
    ]);

    return jsonOk({ messages, unread });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const gate = await requirePortalFromRequest(token, { recordAccess: false });
    if (gate.error) return gate.error;

    const booking = gate.resolved.booking;
    const payload = await request.json();
    const meta = getRequestMeta(request);
    const message = await sendBookingMessage({
      bookingId: booking.id,
      senderRole: 'client',
      senderId: null,
      senderName: clientDisplayName(booking) || 'Client',
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
    const { token } = await params;
    const gate = await requirePortalFromRequest(token, { recordAccess: false });
    if (gate.error) return gate.error;

    await markBookingMessagesRead(gate.resolved.booking.id, 'client');
    return jsonOk({ unread: 0 });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
