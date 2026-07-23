import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import { validateBookingUpdate } from '@/lib/validation';
import { getBooking, updateBooking, deleteBooking } from '@/services/bookingService';
import { toAdminPortalView } from '@/services/portalService';

export async function GET(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const data = await getBooking(id);
    return jsonOk({
      ...data,
      portal: toAdminPortalView(data.portal, request),
    });
  } catch (err) {
    return jsonError(err.message, err.code === 'PGRST116' ? 404 : 500);
  }
}

export async function PATCH(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateBookingUpdate(body);
    if (!validation.success) {
      return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400, {
        issues: validation.error.issues,
      });
    }

    const { expected_version, allow_po_override, ...payload } = body;
    const result = await updateBooking(id, payload, auth.actor, {
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
    return jsonError(err.message, 500);
  }
}

export async function DELETE(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const result = await deleteBooking(id, auth.actor);
    return jsonOk(result);
  } catch (err) {
    const status = err.code === 'NOT_FOUND' || err.code === 'PGRST116' ? 404 : 500;
    return jsonError(err.message, status, { code: err.code });
  }
}
