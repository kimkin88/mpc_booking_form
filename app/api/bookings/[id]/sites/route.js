import { requireAdmin, jsonOk, jsonCreated, jsonError } from '@/lib/api';
import { validateSiteEntry } from '@/lib/validation';
import { createServiceClient } from '@/lib/supabase/admin';
import { logActivity } from '@/services/activityService';
import { bumpVersionAndSnapshot } from '@/services/versionService';

export async function GET(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('site_entries')
    .select('*')
    .eq('booking_id', id)
    .order('created_at');
  if (error) return jsonError(error.message, 500);
  return jsonOk(data);
}

export async function POST(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateSiteEntry(body);
    if (!validation.success) {
      return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400);
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('site_entries')
      .insert({ booking_id: id, ...validation.data })
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
      action: 'site_entry_added',
      section: 'sites',
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
    const validation = validateSiteEntry(rest);
    if (!validation.success) {
      return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400);
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('site_entries')
      .update(validation.data)
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
      action: 'site_entry_updated',
      section: 'sites',
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
    const { entryId, removeAll } = body;
    const supabase = createServiceClient();

    if (removeAll) {
      const type = body.type === 'must_shoot' || body.type === 'avoid' ? body.type : null;
      let listQuery = supabase.from('site_entries').select('*').eq('booking_id', id);
      if (type) listQuery = listQuery.eq('type', type);

      const { data: existing, error: listError } = await listQuery;

      if (listError) return jsonError(listError.message, 500);
      if (!existing?.length) return jsonOk({ deleted: true, count: 0, type: type || 'all' });

      let deleteQuery = supabase.from('site_entries').delete().eq('booking_id', id);
      if (type) deleteQuery = deleteQuery.eq('type', type);
      const { error } = await deleteQuery;
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
        action: 'site_entry_removed',
        section: 'sites',
        previousValue: { count: existing.length, type: type || 'all', sites: existing },
        source: 'admin_portal',
      });

      return jsonOk({ deleted: true, count: existing.length, type: type || 'all' });
    }

    if (!entryId) return jsonError('entryId is required', 400);

    const { data: existing } = await supabase
      .from('site_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    const { error } = await supabase
      .from('site_entries')
      .delete()
      .eq('id', entryId)
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
      action: 'site_entry_removed',
      section: 'sites',
      previousValue: existing,
      source: 'admin_portal',
    });

    return jsonOk({ deleted: true });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
