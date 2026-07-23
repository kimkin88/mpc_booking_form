import {
  generatePortalToken,
  hashToken,
  tokenPrefix,
  hashPin,
  verifyPin,
  generateSessionToken,
  hashSessionToken,
  buildPortalUrl,
} from '@/lib/crypto';
import { createServiceClient } from '@/lib/supabase/admin';
import { buildDefaultPermissionRows } from '@/lib/permissions';
import { DEFAULT_STATUS_PORTAL_EDITABLE } from '@/lib/constants';
import { logActivity } from '@/services/activityService';
import { notifyAdmins, onPortalFirstOpen } from '@/services/notificationService';
import { clientDisplayName } from '@/utils/helpers';

function getPinConfig() {
  return {
    maxAttempts: Number(process.env.PORTAL_PIN_MAX_ATTEMPTS) || 5,
    lockMinutes: Number(process.env.PORTAL_PIN_LOCK_MINUTES) || 15,
    sessionTimeoutMinutes: Number(process.env.PORTAL_SESSION_TIMEOUT_MINUTES) || 60,
  };
}

/**
 * Admin-safe portal payload: includes rebuildable URL and viewable PIN.
 * Never exposes hashes to the client UI.
 */
export function toAdminPortalView(portal, request) {
  if (!portal) return null;
  const {
    access_token_hash,
    pin_hash,
    access_token,
    pin,
    ...safe
  } = portal;
  return {
    ...safe,
    has_pin: !!pin_hash,
    pin: pin || null,
    has_token: !!access_token,
    url: access_token ? buildPortalUrl(access_token, request) : null,
  };
}

export async function getPortalByBooking(bookingId) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('portal_access')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function generatePortalLink(bookingId, actor, options = {}) {
  const supabase = createServiceClient();
  const token = generatePortalToken();
  const access_token_hash = hashToken(token);
  const access_token_prefix = tokenPrefix(token);

  const existing = await getPortalByBooking(bookingId);

  let portal;
  if (existing) {
    const { data, error } = await supabase
      .from('portal_access')
      .update({
        access_token: token,
        access_token_hash,
        access_token_prefix,
        status:
          existing.status === 'disabled'
            ? 'active'
            : existing.status === 'draft'
              ? 'active'
              : existing.status,
        regenerated_at: new Date().toISOString(),
        failed_pin_attempts: 0,
        pin_locked_until: null,
        status_portal_editable:
          existing.status_portal_editable || DEFAULT_STATUS_PORTAL_EDITABLE,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    portal = data;

    await logActivity({
      bookingId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: 'admin',
      action: 'portal_link_regenerated',
      section: 'portal',
      source: 'admin_portal',
    });

    const { count } = await supabase
      .from('portal_field_permissions')
      .select('*', { count: 'exact', head: true })
      .eq('portal_access_id', portal.id);
    if (!count) {
      const { error: permError } = await supabase
        .from('portal_field_permissions')
        .insert(buildDefaultPermissionRows(portal.id));
      if (permError) throw permError;
    }
  } else {
    const { data, error } = await supabase
      .from('portal_access')
      .insert({
        booking_id: bookingId,
        access_token: token,
        access_token_hash,
        access_token_prefix,
        status: 'active',
        status_portal_editable: DEFAULT_STATUS_PORTAL_EDITABLE,
      })
      .select()
      .single();
    if (error) throw error;
    portal = data;

    await logActivity({
      bookingId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: 'admin',
      action: 'portal_link_generated',
      section: 'portal',
      source: 'admin_portal',
    });

    const { error: permError } = await supabase
      .from('portal_field_permissions')
      .insert(buildDefaultPermissionRows(portal.id));
    if (permError) throw permError;
  }

  // Invalidate existing sessions on regenerate
  await supabase.from('portal_sessions').delete().eq('portal_access_id', portal.id);

  return {
    portal,
    token,
    url: buildPortalUrl(token, options.request),
  };
}

export async function setPortalPin(bookingId, pin, actor) {
  const supabase = createServiceClient();
  const portal = await getPortalByBooking(bookingId);
  if (!portal) {
    const err = new Error('Generate a portal link before setting a PIN');
    err.code = 'NO_PORTAL';
    throw err;
  }

  const pin_hash = pin ? await hashPin(pin) : null;

  const { data, error } = await supabase
    .from('portal_access')
    .update({
      pin_hash,
      pin: pin || null,
      failed_pin_attempts: 0,
      pin_locked_until: null,
    })
    .eq('id', portal.id)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    bookingId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: 'admin',
    action: pin ? 'portal_pin_set' : 'portal_pin_reset',
    section: 'portal',
    source: 'admin_portal',
  });

  return data;
}

export async function updatePortalStatus(bookingId, updates, actor) {
  const supabase = createServiceClient();
  const portal = await getPortalByBooking(bookingId);
  if (!portal) {
    const err = new Error('Portal not found');
    err.code = 'NO_PORTAL';
    throw err;
  }

  const allowed = {};
  if (updates.status != null) allowed.status = updates.status;
  if (updates.editing_locked != null) allowed.editing_locked = updates.editing_locked;
  if (Object.prototype.hasOwnProperty.call(updates, 'expires_at')) {
    allowed.expires_at = updates.expires_at;
  }
  if (updates.status_portal_editable != null) {
    allowed.status_portal_editable = {
      ...DEFAULT_STATUS_PORTAL_EDITABLE,
      ...updates.status_portal_editable,
    };
  }

  const { data, error } = await supabase
    .from('portal_access')
    .update(allowed)
    .eq('id', portal.id)
    .select()
    .single();

  if (error) throw error;

  let action = 'portal_updated';
  if (updates.status === 'locked') action = 'portal_locked';
  if (updates.status === 'active' && portal.status === 'locked') action = 'portal_unlocked';
  if (updates.status === 'disabled') action = 'portal_access_disabled';
  if (updates.status === 'active' && portal.status === 'disabled') action = 'portal_access_enabled';
  if (updates.editing_locked === true) action = 'portal_editing_locked';
  if (updates.editing_locked === false) action = 'portal_editing_unlocked';

  await logActivity({
    bookingId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: 'admin',
    action,
    section: 'portal',
    previousValue: { status: portal.status, editing_locked: portal.editing_locked },
    newValue: allowed,
    source: 'admin_portal',
  });

  return data;
}

/**
 * Resolve raw portal token → portal + booking (without exposing admin data).
 */
export async function resolvePortalToken(rawToken) {
  const supabase = createServiceClient();
  const access_token_hash = hashToken(rawToken);
  const prefix = tokenPrefix(rawToken);

  const { data: candidates, error } = await supabase
    .from('portal_access')
    .select('*')
    .eq('access_token_prefix', prefix);

  if (error) throw error;

  const portal = (candidates || []).find((p) => p.access_token_hash === access_token_hash);
  if (!portal) return null;

  if (portal.status === 'disabled') {
    return { portal, booking: null, denied: 'disabled' };
  }

  if (portal.expires_at && new Date(portal.expires_at) < new Date()) {
    return { portal, booking: null, denied: 'expired' };
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', portal.booking_id)
    .single();

  if (bookingError) throw bookingError;

  return { portal, booking, denied: null };
}

export async function authenticatePortal({ rawToken, pin, userAgent, ipAddress }) {
  const resolved = await resolvePortalToken(rawToken);
  if (!resolved) {
    const err = new Error('Invalid portal link');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  const { portal, booking, denied } = resolved;
  if (denied) {
    const err = new Error(denied === 'disabled' ? 'Portal access is disabled' : 'Portal link has expired');
    err.code = denied.toUpperCase();
    throw err;
  }

  const config = getPinConfig();
  const supabase = createServiceClient();

  if (portal.pin_locked_until && new Date(portal.pin_locked_until) > new Date()) {
    const err = new Error('Too many failed PIN attempts. Please try again later.');
    err.code = 'PIN_LOCKED';
    err.lockedUntil = portal.pin_locked_until;
    throw err;
  }

  if (portal.pin_hash) {
    if (!pin) {
      const err = new Error('PIN required');
      err.code = 'PIN_REQUIRED';
      throw err;
    }

    const valid = await verifyPin(pin, portal.pin_hash);
    if (!valid) {
      const attempts = (portal.failed_pin_attempts || 0) + 1;
      const update = { failed_pin_attempts: attempts };
      if (attempts >= config.maxAttempts) {
        update.pin_locked_until = new Date(
          Date.now() + config.lockMinutes * 60 * 1000
        ).toISOString();
        await notifyAdmins(
          booking.id,
          'portal_pin_locked',
          'Portal PIN locked',
          `Repeated failed PIN attempts locked the portal for ${booking.sb_number}.`
        );
        await logActivity({
          bookingId: booking.id,
          actorName: clientDisplayName(booking),
          actorRole: 'client',
          action: 'portal_pin_locked',
          section: 'portal',
          source: 'client_portal',
          ipAddress,
          userAgent,
        });
      }
      await supabase.from('portal_access').update(update).eq('id', portal.id);
      const err = new Error('Incorrect PIN');
      err.code = 'PIN_INVALID';
      err.attemptsRemaining = Math.max(0, config.maxAttempts - attempts);
      throw err;
    }

    await supabase
      .from('portal_access')
      .update({ failed_pin_attempts: 0, pin_locked_until: null })
      .eq('id', portal.id);
  }

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + config.sessionTimeoutMinutes * 60 * 1000);

  await supabase.from('portal_sessions').insert({
    portal_access_id: portal.id,
    session_token_hash: hashSessionToken(sessionToken),
    expires_at: expiresAt.toISOString(),
  });

  const isFirstOpen = !portal.first_opened_at;
  const portalUpdate = {
    last_opened_at: new Date().toISOString(),
  };
  if (isFirstOpen) {
    portalUpdate.first_opened_at = portalUpdate.last_opened_at;
    if (portal.status === 'draft') portalUpdate.status = 'active';
  }

  await supabase.from('portal_access').update(portalUpdate).eq('id', portal.id);

  if (isFirstOpen) {
    await onPortalFirstOpen(booking, portal);
  }

  return {
    sessionToken,
    expiresAt: expiresAt.toISOString(),
    portal: { ...portal, ...portalUpdate },
    booking,
  };
}

export async function validatePortalSession(sessionToken) {
  if (!sessionToken) return null;
  const supabase = createServiceClient();
  const hash = hashSessionToken(sessionToken);

  const { data: session, error } = await supabase
    .from('portal_sessions')
    .select('*, portal_access(*)')
    .eq('session_token_hash', hash)
    .maybeSingle();

  if (error || !session) return null;
  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('portal_sessions').delete().eq('id', session.id);
    return null;
  }

  const config = getPinConfig();
  const newExpiry = new Date(Date.now() + config.sessionTimeoutMinutes * 60 * 1000);
  await supabase
    .from('portal_sessions')
    .update({
      last_activity_at: new Date().toISOString(),
      expires_at: newExpiry.toISOString(),
    })
    .eq('id', session.id);

  return session;
}

export function resolveStatusPortalEditable(portal) {
  return {
    ...DEFAULT_STATUS_PORTAL_EDITABLE,
    ...(portal?.status_portal_editable || {}),
  };
}

export function isPortalEditable(portal, bookingStatus) {
  if (!portal) return false;
  if (portal.status === 'disabled' || portal.status === 'expired') return false;
  if (portal.status === 'locked') return false;
  if (portal.editing_locked) return false;
  if (bookingStatus) {
    const map = resolveStatusPortalEditable(portal);
    if (map[bookingStatus] === false) return false;
  }
  return true;
}

/**
 * Record first/last open timestamps when a client uses their unique link.
 */
export async function recordPortalAccess(portal, booking) {
  const supabase = createServiceClient();
  const isFirstOpen = !portal.first_opened_at;
  const portalUpdate = { last_opened_at: new Date().toISOString() };

  if (isFirstOpen) {
    portalUpdate.first_opened_at = portalUpdate.last_opened_at;
    if (portal.status === 'draft') portalUpdate.status = 'active';
  }

  const { data: updated } = await supabase
    .from('portal_access')
    .update(portalUpdate)
    .eq('id', portal.id)
    .select()
    .single();

  if (isFirstOpen) {
    await onPortalFirstOpen(booking, portal);
  }

  return updated || { ...portal, ...portalUpdate };
}

/**
 * Validate portal access via unique URL token.
 * When a PIN is set, a valid portal session is also required.
 */
export async function requirePortalAccess(
  rawToken,
  { recordAccess = true, sessionToken = null } = {}
) {
  const resolved = await resolvePortalToken(rawToken);

  if (!resolved) {
    return {
      ok: false,
      status: 404,
      code: 'INVALID_TOKEN',
      message: 'Invalid portal link',
    };
  }

  if (resolved.denied === 'disabled') {
    return {
      ok: false,
      status: 403,
      code: 'DISABLED',
      message: 'This portal link has been disabled',
    };
  }

  if (resolved.denied === 'expired') {
    return {
      ok: false,
      status: 403,
      code: 'EXPIRED',
      message: 'This portal link has expired',
    };
  }

  if (resolved.portal.pin_hash) {
    if (
      resolved.portal.pin_locked_until &&
      new Date(resolved.portal.pin_locked_until) > new Date()
    ) {
      return {
        ok: false,
        status: 423,
        code: 'PIN_LOCKED',
        message: 'Too many failed PIN attempts. Please try again later.',
        lockedUntil: resolved.portal.pin_locked_until,
      };
    }

    if (!sessionToken) {
      return {
        ok: false,
        status: 401,
        code: 'PIN_REQUIRED',
        message: 'Enter the PIN to open this booking',
        pinRequired: true,
      };
    }

    const session = await validatePortalSession(sessionToken);
    if (!session || session.portal_access_id !== resolved.portal.id) {
      return {
        ok: false,
        status: 401,
        code: 'PIN_REQUIRED',
        message: 'PIN required or session expired',
        pinRequired: true,
      };
    }
  }

  if (recordAccess) {
    const portal = await recordPortalAccess(resolved.portal, resolved.booking);
    resolved.portal = portal;
  }

  return { ok: true, resolved };
}

