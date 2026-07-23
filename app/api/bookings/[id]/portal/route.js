import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import {
  generatePortalLink,
  getPortalByBooking,
  setPortalPin,
  updatePortalStatus,
  toAdminPortalView,
} from '@/services/portalService';

export async function GET(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id } = await params;
  const portal = await getPortalByBooking(id);
  return jsonOk(toAdminPortalView(portal, request));
}

export async function POST(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action;

    if (action === 'generate' || action === 'regenerate') {
      const result = await generatePortalLink(id, auth.actor, { request });
      return jsonOk({
        portal: toAdminPortalView(result.portal, request),
        url: result.url,
        token: result.token,
      });
    }

    if (action === 'set_pin') {
      const portal = await setPortalPin(id, body.pin || null, auth.actor);
      return jsonOk(toAdminPortalView(portal, request));
    }

    if (action === 'reset_pin') {
      const portal = await setPortalPin(id, null, auth.actor);
      return jsonOk(toAdminPortalView(portal, request));
    }

    if (
      ['lock', 'unlock', 'disable', 'enable', 'lock_editing', 'unlock_editing', 'set_expiry'].includes(
        action
      )
    ) {
      const updates = {};
      if (action === 'lock') {
        updates.status = 'locked';
        updates.editing_locked = true;
      }
      if (action === 'unlock') {
        updates.status = 'active';
        updates.editing_locked = false;
      }
      if (action === 'disable') updates.status = 'disabled';
      if (action === 'enable') updates.status = 'active';
      if (action === 'lock_editing') updates.editing_locked = true;
      if (action === 'unlock_editing') updates.editing_locked = false;
      if (action === 'set_expiry') updates.expires_at = body.expires_at ?? null;

      const portal = await updatePortalStatus(id, updates, auth.actor);
      return jsonOk(toAdminPortalView(portal, request));
    }

    if (action === 'set_status_editability') {
      const portal = await updatePortalStatus(
        id,
        { status_portal_editable: body.status_portal_editable || {} },
        auth.actor
      );
      return jsonOk(toAdminPortalView(portal, request));
    }

    return jsonError('Unknown action', 400);
  } catch (err) {
    return jsonError(err.message, err.code === 'NO_PORTAL' ? 400 : 500, { code: err.code });
  }
}
