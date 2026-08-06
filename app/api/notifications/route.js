import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import {
  listAdminNotifications,
  markNotificationRead,
  markAllAdminNotificationsRead,
  countUnreadAdminNotifications,
} from '@/services/notificationService';

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const adminId = auth.actor?.id || null;
    const { searchParams } = new URL(request.url);
    if (searchParams.get('count') === '1') {
      const unread = await countUnreadAdminNotifications(adminId);
      return jsonOk({ unread });
    }
    const data = await listAdminNotifications({
      limit: Number(searchParams.get('limit') || 40),
      adminId,
    });
    const unread = data.filter((n) => !n.read_at).length;
    return jsonOk({ items: data, unread });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const adminId = auth.actor?.id || null;
    const body = await request.json();
    if (body.action === 'mark_all_read') {
      await markAllAdminNotificationsRead(adminId);
      return jsonOk({ read: true });
    }
    if (!body.id) return jsonError('id is required', 400);
    await markNotificationRead(body.id);
    return jsonOk({ read: true });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
