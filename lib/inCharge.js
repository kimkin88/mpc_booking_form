/**
 * In-charge period calculation (config-driven annual cycles).
 * 2026 cycle: base start 29 Dec 2025, 14-day periods, suffix "26".
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

export function getActiveInChargeCycle(cycles = IN_CHARGE_CYCLES) {
  return cycles.find((c) => c.active) || cycles[0] || null;
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
export function calculateInCharge(campaignStartDate, cycles = IN_CHARGE_CYCLES) {
  const start = parseDateOnly(campaignStartDate);
  if (!start) {
    return {
      reference: null,
      periodIndex: null,
      periodStart: null,
      periodEnd: null,
      warning: 'Campaign start date is required to calculate in-charge.',
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
      warning: `Campaign start is before the ${cycle.cycleName} in-charge cycle begins.`,
    };
  }

  const periodIndex = Math.floor(daysFromBase / cycle.periodLengthDays) + 1;
  if (periodIndex > cycle.numberOfPeriods) {
    return {
      reference: null,
      periodIndex: null,
      periodStart: null,
      periodEnd: null,
      warning: `Campaign start is after the final ${cycle.cycleName} in-charge period (${cycle.numberOfPeriods}-${cycle.yearSuffix}).`,
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

/** Lock date = in-charge period start − daysBefore (default 7 for JCD). */
export function calculatePortalLockDate(campaignStartDate, { daysBefore = 7, cycles } = {}) {
  const ic = calculateInCharge(campaignStartDate, cycles);
  if (!ic.periodStart) {
    return { lockDate: null, ...ic };
  }
  const start = parseDateOnly(ic.periodStart);
  const lock = addDays(start, -daysBefore);
  return {
    lockDate: toDateOnly(lock),
    ...ic,
  };
}
