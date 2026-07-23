import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminSession';

export function jsonOk(data, init = {}) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function jsonCreated(data) {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export async function requireAdmin() {
  const session = await getAdminSession();

  if (!session) {
    return { error: jsonError('Unauthorized', 401) };
  }

  return {
    user: session.user,
    profile: session.profile,
    actor: session.actor,
  };
}

export function getRequestMeta(request) {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null;
  const userAgent = request.headers.get('user-agent') || null;
  return { ipAddress, userAgent };
}
