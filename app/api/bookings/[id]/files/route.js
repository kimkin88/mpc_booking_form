import { jsonOk, jsonError } from '@/lib/api';
import { requireBookingAccess } from '@/lib/requireBookingAccess';
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
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

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
        actor: gate.actor,
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
        actor: gate.actor,
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
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const body = await request.json();

    if (body.action === 'category_status') {
      const data = await updateCategoryStatus({
        bookingId: id,
        category: body.category,
        status: body.status,
        actor: gate.actor,
      });
      return jsonOk(data);
    }

    if (body.action === 'restore') {
      const data = await restoreFile({ fileId: body.fileId, actor: gate.actor });
      return jsonOk(data);
    }

    if (body.action === 'update') {
      const data = await updateFileMeta({
        fileId: body.fileId,
        updates: body.updates || body,
        actor: gate.actor,
      });
      return jsonOk(data);
    }

    return jsonError('Unknown action', 400);
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
    const data = await softDeleteFile({
      fileId: body.fileId,
      actor: gate.actor,
      source: 'admin_portal',
    });
    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
