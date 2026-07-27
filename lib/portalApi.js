import { cookies } from 'next/headers';
import { jsonError } from '@/lib/api';
import { requirePortalAccess, isPortalEditable, resolveStatusPortalEditable } from '@/services/portalService';
import { getBooking } from '@/services/bookingService';
import {
  filterBookingForClient,
  permissionsArrayToMap,
  getFieldPermission,
  canClientView,
} from '@/lib/permissions';
import { createServiceClient } from '@/lib/supabase/admin';
import { getAdminSession } from '@/lib/adminSession';

export const PORTAL_SESSION_COOKIE = 'mpc_portal_session';

export function portalAccessError(result) {
  return jsonError(result.message, result.status, {
    code: result.code,
    pinRequired: result.pinRequired || undefined,
    lockedUntil: result.lockedUntil || undefined,
  });
}

export async function getPortalSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTAL_SESSION_COOKIE)?.value || null;
}

export function portalSessionCookieOptions(token, expiresAt) {
  return {
    name: PORTAL_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt ? new Date(expiresAt) : undefined,
  };
}

export async function requirePortalFromRequest(token, { recordAccess = true } = {}) {
  const sessionToken = await getPortalSessionToken();
  const access = await requirePortalAccess(token, { recordAccess, sessionToken });
  if (!access.ok) {
    return { error: portalAccessError(access) };
  }
  return { resolved: access.resolved };
}

export async function getRecentClientUpdates(bookingId) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('activity_entries')
    .select(
      'id, action, section, field_name, actor_name, actor_role, created_at, source, previous_value, new_value, version_number'
    )
    .eq('booking_id', bookingId)
    .eq('actor_role', 'client')
    .in('action', [
      'field_updated',
      'file_uploaded',
      'file_replaced',
      'file_removed',
      'file_status_changed',
      'schedule_entry_added',
      'schedule_entry_updated',
      'schedule_entry_removed',
      'site_entry_added',
      'site_entry_updated',
      'site_entry_removed',
      'status_changed',
      'booking_submitted',
    ])
    .order('created_at', { ascending: false })
    .limit(40);
  return data || [];
}

/** True when the request has a signed-in Supabase admin. */
export async function portalViewerIsAdmin() {
  const session = await getAdminSession();
  return !!session;
}

export async function buildPortalPayload(bookingId, portal, { includeRecentActivity = false } = {}) {
  const full = await getBooking(bookingId);
  const permissionsMap = permissionsArrayToMap(full.permissions);
  const clientBooking = filterBookingForClient(full.booking, permissionsMap);

  const visibleFiles = (full.files || []).filter((f) => {
    if (f.is_removed) return false;
    return canClientView(getFieldPermission(permissionsMap, 'files'));
  });

  const scheduleVisible = canClientView(getFieldPermission(permissionsMap, 'schedule'));
  const sitesVisible =
    canClientView(getFieldPermission(permissionsMap, 'sites')) ||
    canClientView(getFieldPermission(permissionsMap, 'mpc_chooses_sites'));

  const payload = {
    booking: clientBooking,
    // Clients only get schedule when permitted; signed-in admins always get full schedule
    // so the portal calendar (live formats + shoot days) can render.
    schedule: scheduleVisible || includeRecentActivity ? full.schedule : [],
    sites: sitesVisible || includeRecentActivity ? full.sites : [],
    files: visibleFiles,
    categoryStatuses: full.categoryStatuses,
    permissions: permissionsMap,
    portal: {
      status: portal.status,
      editing_locked: portal.editing_locked,
      manual_unlock: !!portal.manual_unlock,
      editable: isPortalEditable(portal, full.booking?.status),
      has_pin: !!portal.pin_hash,
      status_portal_editable: resolveStatusPortalEditable(portal),
    },
    bookingStatus: full.booking?.status || null,
    viewerIsAdmin: false,
    recentActivity: [],
  };

  if (includeRecentActivity) {
    payload.viewerIsAdmin = true;
    payload.recentActivity = await getRecentClientUpdates(bookingId);
  }

  return payload;
}
