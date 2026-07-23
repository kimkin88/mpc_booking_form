import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import {
  prepareDirectUploads,
  completeDirectUploads,
  prepareDirectReplace,
  completeDirectReplace,
  softDeleteFile,
  restoreFile,
  updateFileMeta,
  updateCategoryStatus,
} from '@/services/fileService';
import { createServiceClient } from '@/lib/supabase/admin';

export async function GET(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const includeRemoved = searchParams.get('includeRemoved') === 'true';

  const supabase = createServiceClient();
  let query = supabase
    .from('file_assets')
    .select('*')
    .eq('booking_id', id)
    .order('created_at', { ascending: false });

  if (!includeRemoved) query = query.eq('is_removed', false);

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);
  return jsonOk(data);
}

export async function POST(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action || 'prepare';

    if (action === 'prepare') {
      const data = await prepareDirectUploads({
        bookingId: id,
        category: body.category,
        files: body.files || [],
        description: body.description || null,
      });
      return jsonOk(data);
    }

    if (action === 'complete') {
      const results = await completeDirectUploads({
        bookingId: id,
        tickets: body.tickets || [],
        actor: auth.actor,
        source: 'admin_portal',
      });
      return jsonOk(results);
    }

    if (action === 'prepare_replace') {
      if (!body.fileId || !body.file) return jsonError('fileId and file are required', 400);
      const slot = await prepareDirectReplace({
        fileId: body.fileId,
        file: body.file,
        source: 'admin_portal',
      });
      return jsonOk(slot);
    }

    if (action === 'complete_replace') {
      if (!body.ticket) return jsonError('ticket is required', 400);
      const asset = await completeDirectReplace({
        ticket: body.ticket,
        actor: auth.actor,
        source: 'admin_portal',
      });
      return jsonOk(asset);
    }

    return jsonError('Unknown action', 400);
  } catch (err) {
    return jsonError(err.message, err.code === 'FORBIDDEN' ? 403 : 500, { code: err.code });
  }
}

export async function PATCH(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'category_status') {
      const data = await updateCategoryStatus({
        bookingId: id,
        category: body.category,
        status: body.status,
        actor: auth.actor,
      });
      return jsonOk(data);
    }

    if (body.action === 'restore') {
      const data = await restoreFile({ fileId: body.fileId, actor: auth.actor });
      return jsonOk(data);
    }

    if (body.action === 'update') {
      const data = await updateFileMeta({
        fileId: body.fileId,
        updates: body.updates || body,
        actor: auth.actor,
      });
      return jsonOk(data);
    }

    return jsonError('Unknown action', 400);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    await params;
    const body = await request.json();
    const data = await softDeleteFile({
      fileId: body.fileId,
      actor: auth.actor,
      source: 'admin_portal',
    });
    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
