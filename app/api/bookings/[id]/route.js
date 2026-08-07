import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import { requireBookingAccess } from '@/lib/requireBookingAccess';
import { validateBookingUpdate } from '@/lib/validation';
import { updateBooking, deleteBooking } from '@/services/bookingService';
import { toAdminPortalView } from '@/services/portalService';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    return jsonOk({
      ...gate.data,
      portal: toAdminPortalView(gate.data.portal, request),
    });
  } catch (err) {
    return jsonError(err.message, err.code === 'PGRST116' ? 404 : 500);
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const body = await request.json();
    const validation = validateBookingUpdate(body);
    if (!validation.success) {
      return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400, {
        issues: validation.error.issues,
      });
    }

    const { expected_version, allow_po_override, ...payload } = body;
    const result = await updateBooking(id, payload, gate.actor, {
      expectedVersion: expected_version,
      allowPoOverride: allow_po_override !== false,
      source: 'admin_portal',
    });

    return jsonOk(result);
  } catch (err) {
    if (err.code === 'VERSION_CONFLICT') {
      return jsonError('Another user has saved changes. Please review before overwriting.', 409, {
        code: 'VERSION_CONFLICT',
        current: err.current,
      });
    }
    if (err.code === 'DUPLICATE_SB') return jsonError(err.message, 409, { code: err.code });
    if (err.code === 'INVALID_OWNER') return jsonError(err.message, 400, { code: err.code });
    return jsonError(err.message, err.status || 500);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const result = await deleteBooking(id, gate.actor);
    return jsonOk(result);
  } catch (err) {
    const status = err.code === 'NOT_FOUND' || err.code === 'PGRST116' ? 404 : 500;
    return jsonError(err.message, status, { code: err.code });
  }
}
