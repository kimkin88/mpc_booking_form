/**
 * Portal automation config (JCD defaults; override via env).
 */

export function getReminderOffsetsDays() {
  const raw = String(process.env.REMINDER_OFFSETS_DAYS || '3,1').trim();
  const days = raw
    .split(',')
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
  return days.length ? [...new Set(days)].sort((a, b) => b - a) : [3, 1];
}

export function reminderTypeForOffset(daysBeforeLock) {
  const offsets = getReminderOffsetsDays();
  if (daysBeforeLock === offsets[offsets.length - 1]) return 'missing_fields_final';
  if (daysBeforeLock === offsets[0]) return 'missing_fields_first';
  return `missing_fields_${daysBeforeLock}d`;
}

export function todayDateOnly(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addCalendarDays(dateOnly, days) {
  const raw = String(dateOnly).slice(0, 10);
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function daysUntil(dateOnly, now = new Date()) {
  const today = todayDateOnly(now);
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${String(dateOnly).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

export function isAutoLockEnabled(booking = {}) {
  if (booking.auto_lock_enabled === false) return false;
  return String(process.env.AUTO_LOCK_ENABLED || 'true').toLowerCase() !== 'false';
}
