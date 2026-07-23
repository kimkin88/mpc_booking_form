import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Create an immutable booking version snapshot.
 */
export async function createBookingSnapshot(bookingId, { createdBy, createdByName, source }) {
  const supabase = createServiceClient();

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bookingError) throw bookingError;

  const [{ data: schedule }, { data: sites }, { data: files }, { data: portal }, { data: categoryStatuses }] =
    await Promise.all([
      supabase.from('schedule_entries').select('*').eq('booking_id', bookingId),
      supabase.from('site_entries').select('*').eq('booking_id', bookingId),
      supabase
        .from('file_assets')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('is_removed', false),
      supabase.from('portal_access').select('id').eq('booking_id', bookingId).maybeSingle(),
      supabase.from('file_category_statuses').select('*').eq('booking_id', bookingId),
    ]);

  let permissions = [];
  if (portal?.id) {
    const { data: portalPerms } = await supabase
      .from('portal_field_permissions')
      .select('*')
      .eq('portal_access_id', portal.id);
    permissions = portalPerms || [];
  }

  const versionNumber = booking.current_version;

  const snapshot = {
    booking,
    schedule: schedule || [],
    sites: sites || [],
    files: files || [],
    permissions,
    categoryStatuses: categoryStatuses || [],
  };

  const { data: version, error } = await supabase
    .from('booking_versions')
    .insert({
      booking_id: bookingId,
      version_number: versionNumber,
      snapshot,
      created_by: createdBy,
      created_by_name: createdByName,
      source,
    })
    .select()
    .single();

  if (error) throw error;
  return version;
}

/**
 * Increment booking version after a successful save and create snapshot.
 */
export async function bumpVersionAndSnapshot(bookingId, actor) {
  const supabase = createServiceClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('current_version')
    .eq('id', bookingId)
    .single();

  if (error) throw error;

  const nextVersion = booking.current_version + 1;

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ current_version: nextVersion })
    .eq('id', bookingId);

  if (updateError) throw updateError;

  const version = await createBookingSnapshot(bookingId, {
    createdBy: actor.id,
    createdByName: actor.name,
    source: actor.source,
  });

  return { versionNumber: nextVersion, version };
}

export async function getVersion(bookingId, versionNumber) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('booking_versions')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('version_number', versionNumber)
    .single();

  if (error) throw error;
  return data;
}

export async function listVersions(bookingId) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('booking_versions')
    .select('id, booking_id, version_number, created_by, created_by_name, source, created_at')
    .eq('booking_id', bookingId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data;
}
