import { jsonOk, jsonError } from '@/lib/api';
import { requireBookingAccess } from '@/lib/requireBookingAccess';
import {
  generatePortalLink,
  getPortalByBooking,
  setPortalPin,
  updatePortalStatus,
  unlockPortalForEditing,
  toAdminPortalView,
} from '@/services/portalService';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const gate = await requireBookingAccess(id);
    if (gate.error) return gate.error;

    const portal = await getPortalByBooking(id);
    return jsonOk(toAdminPortalView(portal, request));
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
    const action = body.action;

    if (action === 'generate' || action === 'regenerate') {
      const result = await generatePortalLink(id, gate.actor, { request });
      return jsonOk({
        portal: toAdminPortalView(result.portal, request),
        url: result.url,
        token: result.token,
      });
    }

    if (action === 'set_pin') {
      const portal = await setPortalPin(id, body.pin || null, gate.actor);
      return jsonOk(toAdminPortalView(portal, request));
    }

    if (action === 'reset_pin') {
      const portal = await setPortalPin(id, null, gate.actor);
      return jsonOk(toAdminPortalView(portal, request));
    }

    if (action === 'unlock') {
      const result = await unlockPortalForEditing(id, gate.actor);
      return jsonOk({
        ...toAdminPortalView(result.portal, request),
        _meta: {
          autoLockDisabled: result.autoLockDisabled,
          bookingStatus: result.bookingStatus,
          portalLockDate: result.portalLockDate,
        },
      });
    }

    if (
      ['lock', 'disable', 'enable', 'lock_editing', 'unlock_editing', 'set_expiry'].includes(action)
    ) {
      const updates = {};
      if (action === 'lock') {
        updates.status = 'locked';
        updates.editing_locked = true;
        updates.manual_unlock = false;
      }
      if (action === 'disable') {
        updates.status = 'disabled';
        updates.manual_unlock = false;
      }
      if (action === 'enable') {
        updates.status = 'active';
        updates.editing_locked = false;
      }
      if (action === 'lock_editing') {
        updates.editing_locked = true;
        updates.manual_unlock = false;
        // Keep status consistent so client isPortaleditable stays false
        updates.status = 'locked';
      }
      if (action === 'unlock_editing') {
        // Soft path → full unlock semantics so it actually works on the client
        const result = await unlockPortalForEditing(id, gate.actor);
        return jsonOk(toAdminPortalView(result.portal, request));
      }
      if (action === 'set_expiry') updates.expires_at = body.expires_at ?? null;

      const portal = await updatePortalStatus(id, updates, gate.actor);
      return jsonOk(toAdminPortalView(portal, request));
    }

    if (action === 'set_status_editability') {
      const portal = await updatePortalStatus(
        id,
        { status_portal_editable: body.status_portal_editable || {} },
        gate.actor
      );
      return jsonOk(toAdminPortalView(portal, request));
    }

    return jsonError('Unknown action', 400);
  } catch (err) {
    return jsonError(err.message, err.code === 'NO_PORTAL' ? 400 : 500, { code: err.code });
  }
}
