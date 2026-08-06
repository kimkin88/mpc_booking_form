/**
 * In-charge period calculation (config-driven annual cycles).
 * 2026 cycle: base start 29 Dec 2025, 14-day periods, suffix "26".
 *
 * Anchor = earliest preferred shoot date (shoot-requirement rows only),
 * falling back to campaign start if no shoot dates exist.
 * Portal lock = Friday strictly before that in-charge period’s start.
 */

export const IN_CHARGE_CYCLES = [
  {
    cycleName: '2026',
    yearSuffix: '26',
    firstPeriodStart: '2025-12-29',
    periodLengthDays: 14,
    numberOfPeriods: 26,
    active: true,
  },
];

function parseDateOnly(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function toDateOnly(date) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysBetween(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

/** UTC Friday = 5 */
function fridayBefore(date) {
  const cursor = addDays(date, -1);
  while (cursor.getUTCDay() !== 5) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return cursor;
}

/** Preferred shoot rows only — ignore calendar live-format ranges. */
function isPreferredShootRow(entry) {
  if (!entry) return false;
  if (entry.live_start && entry.live_end) return false;
  if (entry.day_length == null && entry.format && entry.format !== 'Shoot') return false;
  return Boolean(entry.shoot_date) || entry.day_length != null || entry.format === 'Shoot';
}

export function getActiveInChargeCycle(cycles = IN_CHARGE_CYCLES) {
  return cycles.find((c) => c.active) || cycles[0] || null;
}

/**
 * Earliest preferred shoot date from shoot-requirement rows only
 * (ignores calendar live-format ranges).
 */
export function earliestShootDate(scheduleEntries = []) {
  const dates = (scheduleEntries || [])
    .filter(isPreferredShootRow)
    .map((e) => String(e?.shoot_date || '').slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return dates[0] || null;
}

/**
 * Anchor for in-charge / lock: earliest preferred shoot date, else campaign start.
 * Campaign length does not matter — only the earliest shoot date drives the period.
 */
export function resolveInChargeAnchor({ campaignStart, scheduleEntries } = {}) {
  return (
    earliestShootDate(scheduleEntries) ||
    (campaignStart ? String(campaignStart).slice(0, 10) : null)
  );
}

/**
 * @returns {{
 *   reference: string|null,
 *   periodIndex: number|null,
 *   periodStart: string|null,
 *   periodEnd: string|null,
 *   warning: string|null,
 * }}
 */
export function calculateInCharge(anchorDate, cycles = IN_CHARGE_CYCLES) {
  const start = parseDateOnly(anchorDate);
  if (!start) {
    return {
      reference: null,
      periodIndex: null,
      periodStart: null,
      periodEnd: null,
      warning: 'Preferred shoot date (or campaign start) is required to calculate in-charge.',
    };
  }

  const cycle = getActiveInChargeCycle(cycles);
  if (!cycle) {
    return {
      reference: null,
      periodIndex: null,
      periodStart: null,
      periodEnd: null,
      warning: 'No active in-charge schedule is configured.',
    };
  }

  const base = parseDateOnly(cycle.firstPeriodStart);
  if (!base) {
    return {
      reference: null,
      periodIndex: null,
      periodStart: null,
      periodEnd: null,
      warning: 'In-charge cycle base date is invalid.',
    };
  }

  const daysFromBase = daysBetween(base, start);
  if (daysFromBase < 0) {
    return {
      reference: null,
      periodIndex: null,
      periodStart: null,
      periodEnd: null,
      warning: `Anchor date is before the ${cycle.cycleName} in-charge cycle begins.`,
    };
  }

  const periodIndex = Math.floor(daysFromBase / cycle.periodLengthDays) + 1;
  if (periodIndex > cycle.numberOfPeriods) {
    return {
      reference: null,
      periodIndex: null,
      periodStart: null,
      periodEnd: null,
      warning: `Anchor date is after the final ${cycle.cycleName} in-charge period (${cycle.numberOfPeriods}-${cycle.yearSuffix}).`,
    };
  }

  const periodStart = addDays(base, (periodIndex - 1) * cycle.periodLengthDays);
  const periodEnd = addDays(periodStart, cycle.periodLengthDays - 1);

  return {
    reference: `${periodIndex}-${cycle.yearSuffix}`,
    periodIndex,
    periodStart: toDateOnly(periodStart),
    periodEnd: toDateOnly(periodEnd),
    warning: null,
  };
}

/**
 * Lock date = Friday strictly before in-charge period start.
 * @param {string|null} anchorDate — earliest preferred shoot date or campaign start
 */
export function calculatePortalLockDate(anchorDate, { cycles } = {}) {
  const ic = calculateInCharge(anchorDate, cycles);
  if (!ic.periodStart) {
    return { lockDate: null, ...ic };
  }
  const start = parseDateOnly(ic.periodStart);
  const lock = fridayBefore(start);
  return {
    lockDate: toDateOnly(lock),
    ...ic,
  };
}

/**
 * Compute in-charge + lock from booking + schedule.
 */
export function calculateInChargeFromBooking(booking = {}, scheduleEntries = []) {
  const anchor = resolveInChargeAnchor({
    campaignStart: booking.campaign_start,
    scheduleEntries,
  });
  return calculatePortalLockDate(anchor);
}
