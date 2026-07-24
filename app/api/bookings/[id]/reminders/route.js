import { requireAdmin, jsonOk, jsonError, jsonCreated } from '@/lib/api';
import {
  listRemindersForBooking,
  sendMissingFieldsReminder,
} from '@/services/reminderService';
import { detectMissingFields } from '@/lib/missingFields';
import { getBooking } from '@/services/bookingService';
import { createServiceClient } from '@/lib/supabase/admin';

export async function GET(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const reminders = await listRemindersForBooking(id);
    const detail = await getBooking(id);
    const missing = detectMissingFields({
      booking: detail.booking,
      schedule: detail.schedule,
      files: detail.files,
      categoryStatuses: detail.categoryStatuses,
    });
    return jsonOk({
      reminders,
      missing,
      portal_lock_date: detail.booking?.portal_lock_date || null,
      auto_lock_enabled: detail.booking?.auto_lock_enabled !== false,
    });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'resend';

    if (action === 'set_auto_lock') {
      const supabase = createServiceClient();
      const enabled = body.enabled !== false;
      const { data, error } = await supabase
        .from('bookings')
        .update({ auto_lock_enabled: enabled })
        .eq('id', id)
        .select('id, auto_lock_enabled, portal_lock_date')
        .single();
      if (error) return jsonError(error.message, 500);
      return jsonOk(data);
    }

    if (action === 'resend' || action === 'send_reminder') {
      const result = await sendMissingFieldsReminder({
        bookingId: id,
        reminderType: 'manual',
        force: true,
        actor: {
          id: auth.actor.id,
          name: auth.actor.name,
          role: 'admin',
        },
        source: 'admin_portal',
      });
      return jsonCreated(result);
    }

    return jsonError('Unknown action', 400);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
