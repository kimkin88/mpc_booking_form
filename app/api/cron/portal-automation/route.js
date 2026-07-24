import { jsonOk, jsonError } from '@/lib/api';
import { processDueReminders } from '@/services/reminderService';
import { processDueAutoLocks } from '@/services/autoLockService';

function authorizeCron(request) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) {
    // Allow in development without secret for local testing
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  }
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const querySecret = new URL(request.url).searchParams.get('secret');
  return bearer === secret || querySecret === secret;
}

/**
 * Daily automation: missing-field reminders + portal auto-lock.
 * Secure with CRON_SECRET (Vercel Cron sends Authorization: Bearer <CRON_SECRET>).
 */
export async function GET(request) {
  if (!authorizeCron(request)) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const reminders = await processDueReminders();
    const locks = await processDueAutoLocks();
    return jsonOk({
      ok: true,
      reminders,
      locks,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('portal-automation cron failed', err);
    return jsonError(err.message || 'Cron failed', 500);
  }
}

export async function POST(request) {
  return GET(request);
}
