import { jsonOk, jsonError } from '@/lib/api';
import { isPortalEditable } from '@/services/portalService';
import { requirePortalFromRequest, portalViewerIsAdmin } from '@/lib/portalApi';
import { getBooking } from '@/services/bookingService';
import {
  permissionsArrayToMap,
  getFieldPermission,
  canClientEdit,
  canClientView,
} from '@/lib/permissions';
import {
  prepareDirectUploads,
  completeDirectUploads,
  prepareDirectReplace,
  completeDirectReplace,
  softDeleteFile,
  updateFileMeta,
  getSignedDownloadUrl,
} from '@/services/fileService';
import { clientActorFromBooking } from '@/utils/helpers';

export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const gate = await requirePortalFromRequest(token, { recordAccess: false });
    if (gate.error) return gate.error;

    const { portal, booking } = gate.resolved;
    const viewerIsAdmin = await portalViewerIsAdmin();
    if (!viewerIsAdmin && !isPortalEditable(portal, booking.status)) {
      return jsonError('Portal is read-only', 403);
    }

    const full = await getBooking(booking.id);
    const permissionsMap = permissionsArrayToMap(full.permissions);
    const filePerm = getFieldPermission(permissionsMap, 'files');
    if (!canClientEdit(filePerm)) return jsonError('File uploads are not permitted', 403);

    const body = await request.json();
    const action = body.action || 'prepare';
    const actor = clientActorFromBooking(full.booking || booking);

    if (action === 'prepare') {
      const data = await prepareDirectUploads({
        bookingId: booking.id,
        category: body.category,
        files: body.files || [],
        description: body.description || null,
      });
      return jsonOk(data);
    }

    if (action === 'complete') {
      const results = await completeDirectUploads({
        bookingId: booking.id,
        tickets: body.tickets || [],
        actor,
        source: 'client_portal',
      });
      return jsonOk(results);
    }

    if (action === 'prepare_replace') {
      if (!body.fileId || !body.file) return jsonError('fileId and file are required', 400);
      const existing = full.files.find((f) => f.id === body.fileId);
      if (!existing || existing.uploaded_via !== 'client_portal') {
        return jsonError('You can only replace your own uploads', 403, { code: 'FORBIDDEN' });
      }
      if (existing.status === 'under_review') {
        return jsonError('This file is under review and cannot be replaced', 403, {
          code: 'UNDER_REVIEW',
        });
      }
      if (existing.status === 'approved') {
        return jsonError('This file is approved and cannot be replaced', 403, {
          code: 'APPROVED',
        });
      }
      const slot = await prepareDirectReplace({
        fileId: body.fileId,
        file: body.file,
        source: 'client_portal',
      });
      return jsonOk(slot);
    }

    if (action === 'complete_replace') {
      if (!body.ticket) return jsonError('ticket is required', 400);
      const asset = await completeDirectReplace({
        ticket: body.ticket,
        actor,
        source: 'client_portal',
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
    const { token } = await params;
    const gate = await requirePortalFromRequest(token, { recordAccess: false });
    if (gate.error) return gate.error;

    const { portal, booking } = gate.resolved;
    const viewerIsAdmin = await portalViewerIsAdmin();
    if (!viewerIsAdmin && !isPortalEditable(portal, booking.status)) {
      return jsonError('Portal is read-only', 403);
    }

    const full = await getBooking(booking.id);
    const permissionsMap = permissionsArrayToMap(full.permissions);
    if (!canClientEdit(getFieldPermission(permissionsMap, 'files'))) {
      return jsonError('File edits are not permitted', 403);
    }

    const body = await request.json();
    if (body.action !== 'update') return jsonError('Unknown action', 400);
    if (!body.fileId) return jsonError('fileId is required', 400);

    const existing = (full.files || []).find((f) => f.id === body.fileId && !f.is_removed);
    if (!existing) return jsonError('File not found', 404);

    if (existing.status === 'under_review') {
      return jsonError('This file is under review and cannot be changed', 403, {
        code: 'UNDER_REVIEW',
      });
    }
    if (existing.status === 'approved') {
      return jsonError('This file is approved and cannot be changed', 403, {
        code: 'APPROVED',
      });
    }
    if (existing.uploaded_via !== 'client_portal') {
      return jsonError('You can only edit files you uploaded', 403, { code: 'FORBIDDEN' });
    }

    const updates = body.updates || {};
    if (!('description' in updates)) {
      return jsonError('Only description updates are allowed', 400);
    }

    const data = await updateFileMeta({
      fileId: body.fileId,
      updates: { description: updates.description },
      actor: clientActorFromBooking(full.booking || booking),
    });
    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, err.code === 'FORBIDDEN' ? 403 : 500, { code: err.code });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { token } = await params;
    const gate = await requirePortalFromRequest(token, { recordAccess: false });
    if (gate.error) return gate.error;

    const { portal, booking } = gate.resolved;
    const viewerIsAdmin = await portalViewerIsAdmin();
    if (!viewerIsAdmin && !isPortalEditable(portal, booking.status)) {
      return jsonError('Portal is read-only — file changes are not allowed', 403, {
        code: 'READ_ONLY',
      });
    }

    const full = await getBooking(booking.id);
    const permissionsMap = permissionsArrayToMap(full.permissions);
    if (!canClientEdit(getFieldPermission(permissionsMap, 'files'))) {
      return jsonError('File removal is not permitted for this booking', 403, {
        code: 'FORBIDDEN',
      });
    }

    const body = await request.json();
    const existing = (full.files || []).find((f) => f.id === body.fileId && !f.is_removed);
    if (!existing) return jsonError('File not found', 404);

    if (existing.status === 'under_review') {
      return jsonError('This file is under review and cannot be removed', 403, {
        code: 'UNDER_REVIEW',
      });
    }
    if (existing.status === 'approved') {
      return jsonError('This file is approved and cannot be removed', 403, {
        code: 'APPROVED',
      });
    }
    if (existing.uploaded_via !== 'client_portal') {
      return jsonError('You can only remove files you uploaded', 403, { code: 'FORBIDDEN' });
    }

    const data = await softDeleteFile({
      fileId: body.fileId,
      actor: clientActorFromBooking(full.booking || booking),
      source: 'client_portal',
    });
    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, err.code === 'FORBIDDEN' ? 403 : 500, { code: err.code });
  }
}

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const gate = await requirePortalFromRequest(token, { recordAccess: false });
    if (gate.error) return gate.error;

    const { booking } = gate.resolved;
    const full = await getBooking(booking.id);
    const permissionsMap = permissionsArrayToMap(full.permissions);
    if (!canClientView(getFieldPermission(permissionsMap, 'files'))) {
      return jsonError('Files are not visible', 403);
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    if (!fileId) return jsonError('fileId required', 400);

    const file = full.files.find((f) => f.id === fileId && !f.is_removed);
    if (!file) return jsonError('File not found', 404);

    const { url, file: meta } = await getSignedDownloadUrl(fileId);
    return jsonOk({ url, filename: meta.original_filename });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
