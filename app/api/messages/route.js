import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import { ownedByFilter } from '@/lib/adminAccess';
import { listAdminMessageThreads, countUnreadForAdmin } from '@/services/messageService';

/** Admin inbox: threads + global unread count */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const createdBy = ownedByFilter(auth.actor);
    const [threads, unread] = await Promise.all([
      listAdminMessageThreads({ limit: 200, createdBy }),
      countUnreadForAdmin(null, { createdBy }),
    ]);
    return jsonOk({ threads, unread });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
