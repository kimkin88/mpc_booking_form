import { requireAdmin, jsonOk, jsonCreated, jsonError } from '@/lib/api';
import { validateScheduleEntry } from '@/lib/validation';
import { createServiceClient } from '@/lib/supabase/admin';
import { logActivity } from '@/services/activityService';
import { bumpVersionAndSnapshot } from '@/services/versionService';
import { assertShootFitsBudget, costForDayLength, ratesFromBooking } from '@/lib/rateCard';

function normalizeSchedulePayload(data, booking) {
  const rates = ratesFromBooking(booking || {});
  const dayLength =
    data.day_length != null && data.day_length !== '' ? Number(data.day_length) : null;
  const applied =
    data.applied_rate != null && data.applied_rate !== ''
      ? Number(data.applied_rate)
      : dayLength != null
        ? costForDayLength(dayLength, rates)
        : null;
  return {
    ...data,
    format: data.format || 'Shoot',
    day_length: dayLength,
    city: data.city || null,
    applied_rate: applied,
    applied_currency: data.applied_currency || booking?.currency || 'GBP',
  };
}

export async function GET(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('booking_id', id)
    .order('shoot_date');
  if (error) return jsonError(error.message, 500);
  return jsonOk(data);
}

export async function POST(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateScheduleEntry(body);
    if (!validation.success) {
      return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400);
    }

    const supabase = createServiceClient();

    const [{ data: booking }, { data: existing }] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', id).single(),
      supabase.from('schedule_entries').select('*').eq('booking_id', id),
    ]);
    const row = normalizeSchedulePayload(validation.data, booking);
    if (booking && row.day_length != null) {
      try {
        assertShootFitsBudget(
          booking.budget,
          existing || [],
          ratesFromBooking(booking),
          row.day_length
        );
      } catch (err) {
        return jsonError(err.message, 400);
      }
    }

    const { data, error } = await supabase
      .from('schedule_entries')
      .insert({
        booking_id: id,
        ...row,
        created_by: auth.actor.id,
        updated_by: auth.actor.id,
      })
      .select()
      .single();

    if (error) return jsonError(error.message, 500);

    const { versionNumber } = await bumpVersionAndSnapshot(id, {
      id: auth.actor.id,
      name: auth.actor.name,
      source: 'admin_portal',
    });

    await logActivity({
      bookingId: id,
      versionNumber,
      actorId: auth.actor.id,
      actorName: auth.actor.name,
      actorRole: 'admin',
      action: 'schedule_entry_added',
      section: 'schedule',
      newValue: data,
      source: 'admin_portal',
    });

    return jsonCreated(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function PATCH(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { entryId, ...rest } = body;
    if (!entryId) return jsonError('entryId is required', 400);

    const validation = validateScheduleEntry(rest);
    if (!validation.success) {
      return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400);
    }

    const supabase = createServiceClient();

    const [{ data: booking }, { data: existing }] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', id).single(),
      supabase.from('schedule_entries').select('*').eq('booking_id', id),
    ]);
    const row = normalizeSchedulePayload(validation.data, booking);
    if (booking && row.day_length != null) {
      try {
        assertShootFitsBudget(
          booking.budget,
          existing || [],
          ratesFromBooking(booking),
          row.day_length,
          { excludeEntryId: entryId }
        );
      } catch (err) {
        return jsonError(err.message, 400);
      }
    }

    const { data, error } = await supabase
      .from('schedule_entries')
      .update({ ...row, updated_by: auth.actor.id })
      .eq('id', entryId)
      .eq('booking_id', id)
      .select()
      .single();

    if (error) return jsonError(error.message, 500);

    const { versionNumber } = await bumpVersionAndSnapshot(id, {
      id: auth.actor.id,
      name: auth.actor.name,
      source: 'admin_portal',
    });

    await logActivity({
      bookingId: id,
      versionNumber,
      actorId: auth.actor.id,
      actorName: auth.actor.name,
      actorRole: 'admin',
      action: 'schedule_entry_updated',
      section: 'schedule',
      newValue: data,
      source: 'admin_portal',
    });

    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('id', body.entryId)
      .eq('booking_id', id)
      .single();

    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', body.entryId)
      .eq('booking_id', id);

    if (error) return jsonError(error.message, 500);

    const { versionNumber } = await bumpVersionAndSnapshot(id, {
      id: auth.actor.id,
      name: auth.actor.name,
      source: 'admin_portal',
    });

    await logActivity({
      bookingId: id,
      versionNumber,
      actorId: auth.actor.id,
      actorName: auth.actor.name,
      actorRole: 'admin',
      action: 'schedule_entry_removed',
      section: 'schedule',
      previousValue: existing,
      source: 'admin_portal',
    });

    return jsonOk({ deleted: true });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
