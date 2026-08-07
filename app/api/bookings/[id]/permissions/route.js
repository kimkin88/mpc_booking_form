import { jsonOk, jsonError } from '@/lib/api';
import { requireBookingAccess } from '@/lib/requireBookingAccess';
import { updateFieldPermissions } from '@/services/bookingService';
import { createServiceClient } from '@/lib/supabase/admin';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const supabase = createServiceClient();

    const { data: portal, error: portalError } = await supabase
      .from('portal_access')
      .select('id')
      .eq('booking_id', id)
      .maybeSingle();

    if (portalError) return jsonError(portalError.message, 500);
    if (!portal) return jsonOk([]);

    const { data, error } = await supabase
      .from('portal_field_permissions')
      .select('*')
      .eq('portal_access_id', portal.id);
    if (error) return jsonError(error.message, 500);
    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const body = await request.json();
    const data = await updateFieldPermissions(id, body.permissions || body, gate.actor);
    return jsonOk(data);
  } catch (err) {
    const status = err.code === 'NO_PORTAL' ? 400 : 500;
    return jsonError(err.message, status, { code: err.code });
  }
}
