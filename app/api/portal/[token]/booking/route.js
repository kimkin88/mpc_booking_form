import {
  jsonOk,
  jsonError,
  getRequestMeta,
} from '@/lib/api';
import { isPortalEditable } from '@/services/portalService';
import { requirePortalFromRequest, getRecentClientUpdates, portalViewerIsAdmin } from '@/lib/portalApi';
import { updateBooking, getBooking } from '@/services/bookingService';
import {
  permissionsArrayToMap,
  sanitizeClientUpdate,
  getFieldPermission,
  canClientEdit,
} from '@/lib/permissions';
import {
  validateBookingUpdate,
  validateForSubmission,
  validateScheduleEntry,
  validateSiteEntry,
} from '@/lib/validation';
import { createServiceClient } from '@/lib/supabase/admin';
import { logActivity } from '@/services/activityService';
import { bumpVersionAndSnapshot } from '@/services/versionService';
import { notifyAdmins, notifyClient } from '@/services/notificationService';
import { clientActorFromBooking } from '@/utils/helpers';
import { assertShootFitsBudget, ratesFromBooking } from '@/lib/rateCard';

export async function PATCH(request, { params }) {
  try {
    const { token } = await params;
    const gate = await requirePortalFromRequest(token, { recordAccess: false });
    if (gate.error) return gate.error;

    const { portal, booking } = gate.resolved;
    if (!isPortalEditable(portal, booking.status)) {
      return jsonError('Portal is read-only', 403, { code: 'READ_ONLY' });
    }

    const body = await request.json();
    const full = await getBooking(booking.id);
    const permissionsMap = permissionsArrayToMap(full.permissions);
    const clientActor = clientActorFromBooking(full.booking || booking);

    if (body.action === 'save') {
      const { allowed, rejected } = sanitizeClientUpdate(body.data || {}, permissionsMap);
      if (rejected.length && Object.keys(allowed).length === 0) {
        return jsonError('No permitted fields to update', 403, { rejected });
      }

      const validation = validateBookingUpdate(allowed);
      if (!validation.success) {
        return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400);
      }

      const actor = clientActorFromBooking({
        ...(full.booking || booking),
        ...allowed,
      });

      const result = await updateBooking(booking.id, allowed, actor, {
        expectedVersion: body.expected_version,
        allowPoOverride: false,
        source: 'client_portal',
      });

      await notifyAdmins(
        booking.id,
        'client_updated_booking',
        'Client updated booking',
        `${actor.name} updated ${booking.sb_number}.`
      );

      if (booking.status === 'waiting_for_client' || booking.status === 'draft') {
        await updateBooking(booking.id, { status: 'client_updating' }, actor, {
          source: 'client_portal',
        });
      }

      const recentActivity = (await portalViewerIsAdmin())
        ? await getRecentClientUpdates(booking.id)
        : [];
      return jsonOk({ ...result, rejected, recentActivity });
    }

    if (body.action === 'submit') {
      const schedule = full.schedule;
      const sites = full.sites;
      const check = validateForSubmission(full.booking, permissionsMap, schedule, sites);
      if (!check.valid) {
        return jsonError('Please complete required fields before submitting', 400, {
          code: 'VALIDATION',
          errors: check.errors,
        });
      }

      const result = await updateBooking(
        booking.id,
        { status: 'ready_for_review' },
        clientActor,
        { source: 'client_portal' }
      );

      const supabase = createServiceClient();
      if (portal.status !== 'locked' && portal.status !== 'disabled') {
        await supabase
          .from('portal_access')
          .update({ status: 'submitted' })
          .eq('id', portal.id);
      }

      await logActivity({
        bookingId: booking.id,
        versionNumber: result.versionNumber,
        actorName: clientActor.name,
        actorRole: 'client',
        action: 'booking_submitted',
        section: 'status',
        source: 'client_portal',
        ...getRequestMeta(request),
      });

      await notifyAdmins(
        booking.id,
        'client_completed_required',
        'Booking submitted for review',
        `${clientActor.name} submitted ${booking.sb_number} for review.`
      );

      if (booking.client_email) {
        await notifyClient(
          booking.id,
          booking.client_email,
          'booking_submitted',
          'Booking submitted',
          'Your booking updates were submitted successfully. You can return to this link anytime to make further changes.'
        );
      }

      return jsonOk(result);
    }

    if (body.action === 'add_schedule') {
      if (!canClientEdit(getFieldPermission(permissionsMap, 'schedule'))) {
        return jsonError('Schedule is not editable', 403);
      }
      const validation = validateScheduleEntry(body.data);
      if (!validation.success) {
        return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400);
      }
      const row = {
        ...validation.data,
        format: validation.data.format || 'Shoot',
        day_length:
          validation.data.day_length != null && validation.data.day_length !== ''
            ? Number(validation.data.day_length)
            : null,
        applied_rate:
          validation.data.applied_rate != null && validation.data.applied_rate !== ''
            ? Number(validation.data.applied_rate)
            : null,
        applied_currency: validation.data.applied_currency || booking.currency || 'GBP',
      };
      const supabase = createServiceClient();
      if (row.day_length != null) {
        const { data: existing } = await supabase
          .from('schedule_entries')
          .select('*')
          .eq('booking_id', booking.id);
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
        .insert({ booking_id: booking.id, ...row })
        .select()
        .single();
      if (error) return jsonError(error.message, 500);

      const { versionNumber } = await bumpVersionAndSnapshot(booking.id, {
        id: null,
        name: clientActor.name,
        source: 'client_portal',
      });
      await logActivity({
        bookingId: booking.id,
        versionNumber,
        actorName: clientActor.name,
        actorRole: 'client',
        action: 'schedule_entry_added',
        section: 'schedule',
        newValue: data,
        source: 'client_portal',
      });
      return jsonOk(data);
    }

    if (body.action === 'update_schedule') {
      if (!canClientEdit(getFieldPermission(permissionsMap, 'schedule'))) {
        return jsonError('Schedule is not editable', 403);
      }
      const { entryId, shoot_date, format, day_length, city, applied_rate, applied_currency, live_start, live_end, notes } = body;
      if (!entryId) return jsonError('entryId is required', 400);
      const validation = validateScheduleEntry({
        shoot_date,
        format: format || 'Shoot',
        day_length,
        city,
        applied_rate,
        applied_currency,
        live_start,
        live_end,
        notes,
      });
      if (!validation.success) {
        return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400);
      }
      const supabase = createServiceClient();
      const nextLength =
        validation.data.day_length != null && validation.data.day_length !== ''
          ? Number(validation.data.day_length)
          : null;
      if (nextLength != null) {
        const { data: existing } = await supabase
          .from('schedule_entries')
          .select('*')
          .eq('booking_id', booking.id);
        try {
          assertShootFitsBudget(
            booking.budget,
            existing || [],
            ratesFromBooking(booking),
            nextLength,
            { excludeEntryId: entryId }
          );
        } catch (err) {
          return jsonError(err.message, 400);
        }
      }
      const { data, error } = await supabase
        .from('schedule_entries')
        .update({
          ...validation.data,
          format: validation.data.format || 'Shoot',
          day_length: nextLength,
          applied_rate:
            validation.data.applied_rate != null && validation.data.applied_rate !== ''
              ? Number(validation.data.applied_rate)
              : null,
          applied_currency:
            validation.data.applied_currency || booking.currency || 'GBP',
        })
        .eq('id', entryId)
        .eq('booking_id', booking.id)
        .select()
        .single();
      if (error) return jsonError(error.message, 500);

      const { versionNumber } = await bumpVersionAndSnapshot(booking.id, {
        id: null,
        name: clientActor.name,
        source: 'client_portal',
      });
      await logActivity({
        bookingId: booking.id,
        versionNumber,
        actorName: clientActor.name,
        actorRole: 'client',
        action: 'schedule_entry_updated',
        section: 'schedule',
        newValue: data,
        source: 'client_portal',
      });
      return jsonOk(data);
    }

    if (body.action === 'remove_schedule') {
      if (!canClientEdit(getFieldPermission(permissionsMap, 'schedule'))) {
        return jsonError('Schedule is not editable', 403);
      }
      const supabase = createServiceClient();
      await supabase
        .from('schedule_entries')
        .delete()
        .eq('id', body.entryId)
        .eq('booking_id', booking.id);
      await bumpVersionAndSnapshot(booking.id, {
        id: null,
        name: clientActor.name,
        source: 'client_portal',
      });
      return jsonOk({ deleted: true });
    }

    if (body.action === 'add_site') {
      if (!canClientEdit(getFieldPermission(permissionsMap, 'sites'))) {
        return jsonError('Sites are not editable', 403);
      }
      const validation = validateSiteEntry(body.data);
      if (!validation.success) {
        return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400);
      }
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from('site_entries')
        .insert({ booking_id: booking.id, ...validation.data })
        .select()
        .single();
      if (error) return jsonError(error.message, 500);
      await bumpVersionAndSnapshot(booking.id, {
        id: null,
        name: clientActor.name,
        source: 'client_portal',
      });
      await logActivity({
        bookingId: booking.id,
        actorName: clientActor.name,
        actorRole: 'client',
        action: 'site_entry_added',
        section: 'sites',
        newValue: data,
        source: 'client_portal',
      });
      return jsonOk(data);
    }

    if (body.action === 'remove_site') {
      if (!canClientEdit(getFieldPermission(permissionsMap, 'sites'))) {
        return jsonError('Sites are not editable', 403);
      }
      const supabase = createServiceClient();
      await supabase.from('site_entries').delete().eq('id', body.entryId).eq('booking_id', booking.id);
      await bumpVersionAndSnapshot(booking.id, {
        id: null,
        name: clientActor.name,
        source: 'client_portal',
      });
      return jsonOk({ deleted: true });
    }

    return jsonError('Unknown action', 400);
  } catch (err) {
    if (err.code === 'VERSION_CONFLICT') {
      return jsonError('Conflict detected. Please refresh and review changes.', 409, {
        code: 'VERSION_CONFLICT',
        current: err.current,
      });
    }
    return jsonError(err.message, 500);
  }
}
