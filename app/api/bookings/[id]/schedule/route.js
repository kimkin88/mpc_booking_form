import { jsonOk, jsonCreated, jsonError } from '@/lib/api';
import { requireBookingAccess } from '@/lib/requireBookingAccess';
import { validateScheduleEntry } from '@/lib/validation';
import { createServiceClient } from '@/lib/supabase/admin';
import { logActivity } from '@/services/activityService';
import { bumpVersionAndSnapshot } from '@/services/versionService';
import { assertShootFitsBudget, costForDayLength, ratesFromBooking } from '@/lib/rateCard';
import { isLiveFormatEntry, planRemoveCalendarDay } from '@/lib/calendarFormats';
import { syncInChargeFromSchedule } from '@/services/bookingService';

function normalizeSchedulePayload(data, booking, { actor } = {}) {
  const rates = ratesFromBooking(booking || {});
  const dayLength =
    data.day_length != null && data.day_length !== '' ? Number(data.day_length) : null;
  const liveStart = data.live_start || null;
  const liveEnd = data.live_end || null;
  const isLiveFormat =
    data.kind === 'live_format' || (liveStart && liveEnd && dayLength == null);
  const applied =
    data.applied_rate != null && data.applied_rate !== ''
      ? Number(data.applied_rate)
      : dayLength != null
        ? costForDayLength(dayLength, rates)
        : null;
  // Never trust client-supplied authorship
  const {
    kind: _kind,
    added_via: _addedVia,
    added_by_name: _addedByName,
    created_by: _createdBy,
    updated_by: _updatedBy,
    ...rest
  } = data;
  const row = {
    ...rest,
    shoot_date: data.shoot_date || liveStart,
    live_start: liveStart,
    live_end: liveEnd,
    format: data.format || (isLiveFormat ? 'Format' : 'Shoot'),
    day_length: dayLength,
    city: data.city || null,
    applied_rate: applied,
    applied_currency: data.applied_currency || booking?.currency || 'GBP',
  };
  if (actor) {
    row.added_via = actor.source || 'admin_portal';
    row.added_by_name = actor.name || null;
  }
  return row;
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('booking_id', id)
      .order('shoot_date');
    if (error) return jsonError(error.message, 500);
    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

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
    const row = normalizeSchedulePayload(validation.data, booking, {
      actor: { name: gate.actor.name, source: 'admin_portal' },
    });
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
        created_by: gate.actor.id,
        updated_by: gate.actor.id,
      })
      .select()
      .single();

    if (error) return jsonError(error.message, 500);

    const { versionNumber } = await bumpVersionAndSnapshot(id, {
      id: gate.actor.id,
      name: gate.actor.name,
      source: 'admin_portal',
    });

    await logActivity({
      bookingId: id,
      versionNumber,
      actorId: gate.actor.id,
      actorName: gate.actor.name,
      actorRole: 'admin',
      action: 'schedule_entry_added',
      section: 'schedule',
      newValue: data,
      source: 'admin_portal',
    });

    await syncInChargeFromSchedule(id);

    return jsonCreated(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

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
      .update({ ...row, updated_by: gate.actor.id })
      .eq('id', entryId)
      .eq('booking_id', id)
      .select()
      .single();

    if (error) return jsonError(error.message, 500);

    const { versionNumber } = await bumpVersionAndSnapshot(id, {
      id: gate.actor.id,
      name: gate.actor.name,
      source: 'admin_portal',
    });

    await logActivity({
      bookingId: id,
      versionNumber,
      actorId: gate.actor.id,
      actorName: gate.actor.name,
      actorRole: 'admin',
      action: 'schedule_entry_updated',
      section: 'schedule',
      newValue: data,
      source: 'admin_portal',
    });

    await syncInChargeFromSchedule(id);

    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const body = await request.json();
    const supabase = createServiceClient();

    if (body.removeLiveFormats) {
      const { data: existing, error: listError } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('booking_id', id)
        .not('live_start', 'is', null);

      if (listError) return jsonError(listError.message, 500);
      if (!existing?.length) return jsonOk({ deleted: true, count: 0 });

      const { error } = await supabase
        .from('schedule_entries')
        .delete()
        .eq('booking_id', id)
        .not('live_start', 'is', null);

      if (error) return jsonError(error.message, 500);

      const { versionNumber } = await bumpVersionAndSnapshot(id, {
        id: gate.actor.id,
        name: gate.actor.name,
        source: 'admin_portal',
      });

      await logActivity({
        bookingId: id,
        versionNumber,
        actorId: gate.actor.id,
        actorName: gate.actor.name,
        actorRole: 'admin',
        action: 'schedule_entry_removed',
        section: 'schedule',
        previousValue: { count: existing.length, liveFormats: true },
        source: 'admin_portal',
      });

      await syncInChargeFromSchedule(id);

      return jsonOk({ deleted: true, count: existing.length });
    }

    if (!body.entryId) return jsonError('entryId is required', 400);

    const { data: existing, error: loadError } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('id', body.entryId)
      .eq('booking_id', id)
      .single();

    if (loadError || !existing) return jsonError('Schedule entry not found', 404);

    const dateKey = body.date ? String(body.date).slice(0, 10) : null;

    // Remove only the selected calendar day (shrink / split live ranges).
    if (dateKey && (isLiveFormatEntry(existing) || existing.day_length != null)) {
      const plan = planRemoveCalendarDay(existing, dateKey);
      if (plan.error) return jsonError(plan.error, 400);

      if (plan.mode === 'delete') {
        const { error } = await supabase
          .from('schedule_entries')
          .delete()
          .eq('id', body.entryId)
          .eq('booking_id', id);
        if (error) return jsonError(error.message, 500);
      } else if (plan.mode === 'update') {
        const { error } = await supabase
          .from('schedule_entries')
          .update({
            ...plan.patch,
            updated_by: gate.actor.id,
          })
          .eq('id', body.entryId)
          .eq('booking_id', id);
        if (error) return jsonError(error.message, 500);
      } else if (plan.mode === 'split') {
        const { error: updateError } = await supabase
          .from('schedule_entries')
          .update({
            ...plan.patch,
            updated_by: gate.actor.id,
          })
          .eq('id', body.entryId)
          .eq('booking_id', id);
        if (updateError) return jsonError(updateError.message, 500);

        const {
          id: _id,
          created_at: _createdAt,
          updated_at: _updatedAt,
          ...rest
        } = existing;
        const { error: insertError } = await supabase.from('schedule_entries').insert({
          ...rest,
          ...plan.insert,
          booking_id: id,
          created_by: gate.actor.id,
          updated_by: gate.actor.id,
        });
        if (insertError) return jsonError(insertError.message, 500);
      }

      const { versionNumber } = await bumpVersionAndSnapshot(id, {
        id: gate.actor.id,
        name: gate.actor.name,
        source: 'admin_portal',
      });

      await logActivity({
        bookingId: id,
        versionNumber,
        actorId: gate.actor.id,
        actorName: gate.actor.name,
        actorRole: 'admin',
        action: 'schedule_entry_removed',
        section: 'schedule',
        previousValue: { ...existing, removedDate: dateKey, mode: plan.mode },
        source: 'admin_portal',
      });

      await syncInChargeFromSchedule(id);

      return jsonOk({ deleted: plan.mode === 'delete', mode: plan.mode, date: dateKey });
    }

    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', body.entryId)
      .eq('booking_id', id);

    if (error) return jsonError(error.message, 500);

    const { versionNumber } = await bumpVersionAndSnapshot(id, {
      id: gate.actor.id,
      name: gate.actor.name,
      source: 'admin_portal',
    });

    await logActivity({
      bookingId: id,
      versionNumber,
      actorId: gate.actor.id,
      actorName: gate.actor.name,
      actorRole: 'admin',
      action: 'schedule_entry_removed',
      section: 'schedule',
      previousValue: existing,
      source: 'admin_portal',
    });

    await syncInChargeFromSchedule(id);

    return jsonOk({ deleted: true });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
