import { createServiceClient } from '@/lib/supabase/admin';
import { BOOKING_STATUSES, FILE_CATEGORIES } from '@/lib/constants';
import { logActivity, logFieldChanges } from '@/services/activityService';
import { bumpVersionAndSnapshot, createBookingSnapshot } from '@/services/versionService';
import { notifyClient } from '@/services/notificationService';
import { diffObjects } from '@/utils/helpers';
import { calculateDeliveryDate } from '@/lib/deliveryDate';
import { calculateInChargeFromBooking } from '@/lib/inCharge';
import { costForDayLength, ratesFromBooking } from '@/lib/rateCard';

function statusLabel(value) {
  return BOOKING_STATUSES.find((s) => s.value === value)?.label || value;
}
const TRACKED_FIELDS = [
  'sb_number',
  'status',
  'currency',
  'budget',
  'budget_required',
  'brand',
  'campaign_name',
  'city_market',
  'client_company',
  'client_name',
  'client_email',
  'jcd_contact_name',
  'jcd_contact_email',
  'cc_emails',
  'format_type',
  'format_type_other',
  'campaign_start',
  'campaign_end',
  'calculated_delivery_date',
  'delivery_date_override',
  'in_charge_reference',
  'in_charge_period_start',
  'in_charge_period_end',
  'portal_lock_date',
  'auto_lock_enabled',
  'half_day_rate',
  'full_day_rate',
  'rate_card_label',
  'mpc_owner_name',
  'mpc_backup_owner_name',
  'mpc_chooses_sites',
  'use_remaining_for_extra_shots',
  'po_required',
  'po_received',
  'po_number',
  'payment_terms',
  'billing_address',
  'invoice_notes',
  'internal_notes',
  'client_notes',
];

export async function listBookings({
  search = '',
  status = null,
  page = 1,
  pageSize = 20,
  sort = 'updated_desc',
} = {}) {
  const supabase = createServiceClient();
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const sortMap = {
    updated_desc: { column: 'updated_at', ascending: false },
    updated_asc: { column: 'updated_at', ascending: true },
    created_desc: { column: 'created_at', ascending: false },
    created_asc: { column: 'created_at', ascending: true },
    sb_asc: { column: 'sb_number', ascending: true },
    sb_desc: { column: 'sb_number', ascending: false },
    client_asc: { column: 'client_company', ascending: true },
    client_desc: { column: 'client_company', ascending: false },
    campaign_asc: { column: 'campaign_name', ascending: true },
    campaign_desc: { column: 'campaign_name', ascending: false },
  };
  const sortConfig = sortMap[sort] || sortMap.updated_desc;

  let query = supabase
    .from('bookings')
    .select(
      'id, sb_number, status, campaign_name, client_company, city_market, currency, budget, current_version, updated_at, created_at',
      { count: 'exact' }
    )
    .order(sortConfig.column, { ascending: sortConfig.ascending, nullsFirst: false })
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(
      `sb_number.ilike.%${search}%,campaign_name.ilike.%${search}%,client_company.ilike.%${search}%,brand.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    items: data || [],
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

/**
 * Generate the next unique SB number for the current year.
 * Format: SB-YYYY-NNN (e.g. SB-2026-001)
 */
export async function generateNextSbNumber(year = new Date().getFullYear()) {
  const supabase = createServiceClient();
  const prefix = `SB-${year}-`;

  const { data, error } = await supabase
    .from('bookings')
    .select('sb_number')
    .ilike('sb_number', `${prefix}%`);

  if (error) throw error;

  let maxSeq = 0;
  for (const row of data || []) {
    const match = String(row.sb_number || '').match(/^SB-\d{4}-(\d+)$/i);
    if (!match) continue;
    const seq = Number(match[1]);
    if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
  }

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

export async function getBooking(bookingId) {
  const supabase = createServiceClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error) throw error;

  const [
    { data: schedule },
    { data: sites },
    { data: files },
    { data: categoryStatuses },
    { data: portal },
  ] = await Promise.all([
    supabase.from('schedule_entries').select('*').eq('booking_id', bookingId).order('shoot_date'),
    supabase.from('site_entries').select('*').eq('booking_id', bookingId).order('created_at'),
    supabase
      .from('file_assets')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false }),
    supabase.from('file_category_statuses').select('*').eq('booking_id', bookingId),
    supabase.from('portal_access').select('*').eq('booking_id', bookingId).maybeSingle(),
  ]);

  let permissions = [];
  if (portal?.id) {
    const { data: portalPerms, error: permError } = await supabase
      .from('portal_field_permissions')
      .select('*')
      .eq('portal_access_id', portal.id);
    if (permError) throw permError;
    permissions = portalPerms || [];
  }

  return {
    booking,
    schedule: schedule || [],
    sites: sites || [],
    files: files || [],
    permissions,
    categoryStatuses: categoryStatuses || [],
    portal,
  };
}

export async function createBooking(payload, actor) {
  const supabase = createServiceClient();

  const sbNumber =
    payload.sb_number && String(payload.sb_number).trim()
      ? String(payload.sb_number).trim()
      : await generateNextSbNumber();

  const insert = {
    sb_number: sbNumber,
    currency: payload.currency || 'GBP',
    budget: payload.budget != null && payload.budget !== '' ? Number(payload.budget) : null,
    brand: payload.brand || null,
    campaign_name: payload.campaign_name || null,
    client_company: payload.client_company || null,
    city_market: payload.city_market || null,
    half_day_rate: payload.half_day_rate != null ? Number(payload.half_day_rate) : 640,
    full_day_rate: payload.full_day_rate != null ? Number(payload.full_day_rate) : 1040,
    rate_card_label: payload.rate_card_label || 'JCD Rates',
    mpc_chooses_sites: true,
    status: 'draft',
    current_version: 1,
    created_by: actor.id,
  };

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert(insert)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const err = new Error('SB Number must be unique');
      err.code = 'DUPLICATE_SB';
      throw err;
    }
    throw error;
  }

  const categoryRows = FILE_CATEGORIES.map((c) => ({
    booking_id: booking.id,
    category: c.value,
    status: 'missing',
  }));
  await supabase.from('file_category_statuses').insert(categoryRows);

  await createBookingSnapshot(booking.id, {
    createdBy: actor.id,
    createdByName: actor.name,
    source: 'admin_portal',
  });

  await logActivity({
    bookingId: booking.id,
    versionNumber: 1,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: 'admin',
    action: 'booking_created',
    section: 'reference',
    source: 'admin_portal',
    newValue: { sb_number: booking.sb_number },
  });

  return booking;
}

export async function updateBooking(bookingId, payload, actor, options = {}) {
  const supabase = createServiceClient();
  const { expectedVersion, allowPoOverride = true, source = 'admin_portal' } = options;

  const { data: current, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError) throw fetchError;

  if (expectedVersion != null && current.current_version !== expectedVersion) {
    const err = new Error('Version conflict');
    err.code = 'VERSION_CONFLICT';
    err.current = current;
    throw err;
  }

  // PO Received guard (admin can override)
  if (
    payload.po_received === true &&
    (payload.po_required === false ||
      (payload.po_required === undefined && !current.po_required)) &&
    !allowPoOverride
  ) {
    const err = new Error('PO Received cannot be enabled before PO Required');
    err.code = 'PO_ORDER';
    throw err;
  }

  const updates = {};
  TRACKED_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      updates[field] = payload[field];
    }
  });

  if (Object.prototype.hasOwnProperty.call(updates, 'budget') && updates.budget !== null && updates.budget !== '') {
    updates.budget = Number(updates.budget);
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'half_day_rate') &&
    updates.half_day_rate !== null &&
    updates.half_day_rate !== ''
  ) {
    updates.half_day_rate = Number(updates.half_day_rate);
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'full_day_rate') &&
    updates.full_day_rate !== null &&
    updates.full_day_rate !== ''
  ) {
    updates.full_day_rate = Number(updates.full_day_rate);
  }

  // Recalculate derived schedule fields when format or campaign start changes
  // (or when clearing override / forcing refresh via those fields).
  const merged = { ...current, ...updates };
  const formatOrStartChanged =
    Object.prototype.hasOwnProperty.call(updates, 'format_type') ||
    Object.prototype.hasOwnProperty.call(updates, 'campaign_start') ||
    Object.prototype.hasOwnProperty.call(updates, 'format_type_other');

  if (formatOrStartChanged || !current.in_charge_reference || !current.portal_lock_date) {
    const delivery = calculateDeliveryDate(merged.format_type, merged.campaign_start);
    updates.calculated_delivery_date = delivery.status === 'calculated' ? delivery.date : null;

    const { data: scheduleRows } = await supabase
      .from('schedule_entries')
      .select('shoot_date')
      .eq('booking_id', bookingId);
    const lock = calculateInChargeFromBooking(merged, scheduleRows || []);
    updates.in_charge_reference = lock.reference;
    updates.in_charge_period_start = lock.periodStart;
    updates.in_charge_period_end = lock.periodEnd;
    updates.portal_lock_date = lock.lockDate;
  }

  if (Object.keys(updates).length === 0) {
    return { booking: current, changes: [], versionNumber: current.current_version };
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const err = new Error('SB Number must be unique');
      err.code = 'DUPLICATE_SB';
      throw err;
    }
    throw error;
  }

  // When the rate card changes, re-apply costs onto shoot rows so portal/admin
  // remaining budget and row totals match the new rates immediately.
  const ratesChanged =
    Object.prototype.hasOwnProperty.call(updates, 'half_day_rate') ||
    Object.prototype.hasOwnProperty.call(updates, 'full_day_rate') ||
    Object.prototype.hasOwnProperty.call(updates, 'rate_card_label');
  if (ratesChanged) {
    const rates = ratesFromBooking(booking);
    const { data: shootRows } = await supabase
      .from('schedule_entries')
      .select('id, day_length, live_start, live_end, applied_currency')
      .eq('booking_id', bookingId);

    const toUpdate = (shootRows || []).filter((row) => {
      if (row?.live_start && row?.live_end && (row.day_length == null || row.day_length === '')) {
        return false;
      }
      return row.day_length != null && row.day_length !== '';
    });

    await Promise.all(
      toUpdate.map((row) =>
        supabase
          .from('schedule_entries')
          .update({
            applied_rate: costForDayLength(row.day_length, rates),
            applied_currency: row.applied_currency || booking.currency || 'GBP',
          })
          .eq('id', row.id)
          .eq('booking_id', bookingId)
      )
    );
  }

  const changes = diffObjects(current, booking, TRACKED_FIELDS);

  const { versionNumber } = await bumpVersionAndSnapshot(bookingId, {
    id: actor.id,
    name: actor.name,
    source,
  });

  // Dedicated actions below cover these fields — skip duplicate field_updated rows.
  const fieldChanges = changes.filter(
    (c) => c.field !== 'status' && c.field !== 'mpc_chooses_sites'
  );

  await logFieldChanges({
    bookingId,
    versionNumber,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role || 'admin',
    source,
    section: 'booking',
    changes: fieldChanges,
  });

  if (updates.status && updates.status !== current.status) {
    await logActivity({
      bookingId,
      versionNumber,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role || 'admin',
      action: 'status_changed',
      section: 'status',
      fieldName: 'status',
      previousValue: current.status,
      newValue: updates.status,
      source,
    });

    if (source === 'admin_portal') {
      const email = booking.client_email || current.client_email;
      if (email) {
        const nextLabel = statusLabel(updates.status);
        const type =
          updates.status === 'changes_requested'
            ? 'admin_requested_info'
            : 'booking_updated_by_admin';
        const title =
          updates.status === 'changes_requested'
            ? 'Changes requested on your booking'
            : 'Booking status updated';
        const body =
          updates.status === 'changes_requested'
            ? `Your contact requested changes. The booking is now “${nextLabel}”. Open your portal link to review and update.`
            : `Your booking status is now “${nextLabel}”.`;
        await notifyClient(bookingId, email, type, title, body, {
          previousStatus: current.status,
          status: updates.status,
        });
      }
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(updates, 'mpc_chooses_sites') &&
    updates.mpc_chooses_sites !== current.mpc_chooses_sites
  ) {
    await logActivity({
      bookingId,
      versionNumber,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role || 'admin',
      action: updates.mpc_chooses_sites ? 'mpc_chooses_sites_enabled' : 'mpc_chooses_sites_disabled',
      section: 'sites',
      fieldName: 'mpc_chooses_sites',
      previousValue: current.mpc_chooses_sites,
      newValue: updates.mpc_chooses_sites,
      source,
    });
  }

  const { data: refreshed } = await supabase.from('bookings').select('*').eq('id', bookingId).single();

  return { booking: refreshed, changes, versionNumber };
}

export async function updateFieldPermissions(bookingId, permissions, actor) {
  const supabase = createServiceClient();

  const { data: portal, error: portalError } = await supabase
    .from('portal_access')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (portalError) throw portalError;
  if (!portal) {
    const err = new Error('Generate a portal link before setting field permissions');
    err.code = 'NO_PORTAL';
    throw err;
  }

  const rows = Object.entries(permissions).map(([field_key, permission]) => ({
    portal_access_id: portal.id,
    field_key,
    permission,
  }));

  const { error } = await supabase.from('portal_field_permissions').upsert(rows, {
    onConflict: 'portal_access_id,field_key',
  });

  if (error) throw error;

  await logActivity({
    bookingId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: 'admin',
    action: 'permissions_updated',
    section: 'permissions',
    source: 'admin_portal',
    newValue: permissions,
  });

  return rows;
}

/**
 * Permanently delete a booking and all related DB rows (cascade).
 * Also removes stored files from the booking-files bucket.
 */
export async function deleteBooking(bookingId, _actor) {
  const supabase = createServiceClient();

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, sb_number')
    .eq('id', bookingId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!booking) {
    const err = new Error('Booking not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { data: files } = await supabase
    .from('file_assets')
    .select('storage_key')
    .eq('booking_id', bookingId);

  const storageKeys = (files || []).map((f) => f.storage_key).filter(Boolean);
  if (storageKeys.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('booking-files')
      .remove(storageKeys);
    if (storageError) {
      console.error('Failed to remove booking files from storage:', storageError);
    }
  }

  const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
  if (error) throw error;

  return { deleted: true, id: bookingId, sb_number: booking.sb_number };
}

/**
 * Recalculate in-charge + portal lock from earliest preferred shoot date
 * (falls back to campaign_start). Call after schedule shoot dates change.
 */
export async function syncInChargeFromSchedule(bookingId) {
  const supabase = createServiceClient();
  const [{ data: booking }, { data: schedule }] = await Promise.all([
    supabase.from('bookings').select('*').eq('id', bookingId).single(),
    supabase.from('schedule_entries').select('shoot_date').eq('booking_id', bookingId),
  ]);
  if (!booking) return null;

  const lock = calculateInChargeFromBooking(booking, schedule || []);
  const updates = {
    in_charge_reference: lock.reference,
    in_charge_period_start: lock.periodStart,
    in_charge_period_end: lock.periodEnd,
    portal_lock_date: lock.lockDate,
  };

  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

