import { createServiceClient } from '@/lib/supabase/admin';

/**
 * Immutable activity log writer for client and admin actions.
 */
export async function logActivity({
  bookingId,
  versionNumber = null,
  actorId = null,
  actorName,
  actorRole,
  action,
  section = null,
  fieldName = null,
  previousValue = null,
  newValue = null,
  metadata = {},
  source,
  ipAddress = null,
  userAgent = null,
}) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('activity_entries')
    .insert({
      booking_id: bookingId,
      version_number: versionNumber,
      actor_id: actorId,
      actor_name: actorName,
      actor_role: actorRole,
      action,
      section,
      field_name: fieldName,
      previous_value: previousValue,
      new_value: newValue,
      metadata,
      source,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log activity:', error);
    throw error;
  }

  return data;
}

export async function logFieldChanges({
  bookingId,
  versionNumber,
  actorId,
  actorName,
  actorRole,
  source,
  section,
  changes,
  ipAddress,
  userAgent,
}) {
  if (!changes?.length) return [];

  const supabase = createServiceClient();
  const rows = changes.map((change) => ({
    booking_id: bookingId,
    version_number: versionNumber,
    actor_id: actorId,
    actor_name: actorName,
    actor_role: actorRole,
    action: 'field_updated',
    section,
    field_name: change.field,
    previous_value: change.previous,
    new_value: change.next,
    metadata: {},
    source,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  }));

  const { data, error } = await supabase.from('activity_entries').insert(rows).select();
  if (error) {
    console.error('Failed to log field changes:', error);
    throw error;
  }
  return data;
}
