import { NextResponse } from 'next/server';
import { jsonOk, jsonError, getRequestMeta } from '@/lib/api';
import {
  requirePortalFromRequest,
  buildPortalPayload,
  portalSessionCookieOptions,
  portalViewerIsAdmin,
} from '@/lib/portalApi';
import { authenticatePortal } from '@/services/portalService';

export async function GET(_request, { params }) {
  try {
    const { token } = await params;
    const gate = await requirePortalFromRequest(token);
    if (gate.error) return gate.error;

    const { portal, booking } = gate.resolved;
    const includeRecentActivity = await portalViewerIsAdmin();
    const payload = await buildPortalPayload(booking.id, portal, { includeRecentActivity });

    return jsonOk({
      displayName: booking.campaign_name || booking.client_company || booking.sb_number,
      ...payload,
    });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const body = await request.json();

    if (body.action !== 'unlock') {
      return jsonError('Unknown action', 400);
    }

    const meta = getRequestMeta(request);
    const result = await authenticatePortal({
      rawToken: token,
      pin: body.pin,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const response = NextResponse.json({
      ok: true,
      data: {
        unlocked: true,
        expiresAt: result.expiresAt,
        has_pin: true,
      },
    });

    const cookie = portalSessionCookieOptions(result.sessionToken, result.expiresAt);
    response.cookies.set(cookie);

    return response;
  } catch (err) {
    const status =
      err.code === 'PIN_INVALID' || err.code === 'PIN_REQUIRED'
        ? 401
        : err.code === 'PIN_LOCKED'
          ? 423
          : err.code === 'INVALID_TOKEN'
            ? 404
            : 400;
    return jsonError(err.message, status, {
      code: err.code,
      attemptsRemaining: err.attemptsRemaining,
      lockedUntil: err.lockedUntil,
    });
  }
}
