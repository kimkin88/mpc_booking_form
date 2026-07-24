/**
 * Flexible per-booking rate cards.
 * Defaults match JCD: 1040 full day, 640 half day.
 */

export const DEFAULT_RATE_CARD = {
  label: 'JCD Rates',
  halfDay: 640,
  fullDay: 1040,
};

export const DAY_LENGTH_OPTIONS = [
  { value: '0.5', label: '0.5 day', rateKey: 'halfDay' },
  { value: '1', label: '1 day', rateKey: 'fullDay' },
];

/** True when a numeric budget cap is present (null / '' / undefined = unlimited). */
export function hasBudgetCap(budget) {
  if (budget === null || budget === undefined || budget === '') return false;
  const cap = Number(budget);
  return Number.isFinite(cap) && cap >= 0;
}

export function ratesFromBooking(booking = {}) {
  const halfDay = Number(booking.half_day_rate);
  const fullDay = Number(booking.full_day_rate);
  return {
    label: booking.rate_card_label || DEFAULT_RATE_CARD.label,
    halfDay: Number.isFinite(halfDay) && halfDay > 0 ? halfDay : DEFAULT_RATE_CARD.halfDay,
    fullDay: Number.isFinite(fullDay) && fullDay > 0 ? fullDay : DEFAULT_RATE_CARD.fullDay,
  };
}

export function costForDayLength(dayLength, rates) {
  const len = Number(dayLength);
  if (len === 0.5) return rates.halfDay;
  if (len === 1) return rates.fullDay;
  return 0;
}

export function shootRowsCost(entries = [], rates) {
  return (entries || []).reduce((sum, row) => {
    // Prefer the rate snapshotted on the row so historical bookings keep their cost
    // even if the booking rate card changes later.
    const applied = Number(row.applied_rate);
    if (Number.isFinite(applied) && applied >= 0) {
      return sum + applied;
    }
    return sum + costForDayLength(row.day_length, rates);
  }, 0);
}

export function remainingBudget(budget, entries, rates) {
  if (!hasBudgetCap(budget)) return Infinity;
  const cap = Number(budget);
  return cap - shootRowsCost(entries, rates);
}

/** Smallest bookable unit (half day) fits in remaining budget. */
export function canAddShootRow(budget, entries, rates) {
  if (!hasBudgetCap(budget)) return true;
  return remainingBudget(budget, entries, rates) >= rates.halfDay;
}

/** Day lengths still affordable for a new (or replacement) row. */
export function affordableDayLengths(budget, entries, rates, { excludeEntryId } = {}) {
  if (!hasBudgetCap(budget)) return [...DAY_LENGTH_OPTIONS];
  const others = (entries || []).filter((e) => e.id !== excludeEntryId);
  const remaining = remainingBudget(budget, others, rates);
  return DAY_LENGTH_OPTIONS.filter((opt) => costForDayLength(opt.value, rates) <= remaining + 1e-9);
}

/**
 * Throws if day_length would exceed budget (when budget is set).
 * @returns {true} when ok
 */
export function assertShootFitsBudget(budget, entries, rates, dayLength, { excludeEntryId } = {}) {
  if (!hasBudgetCap(budget)) return true;
  const affordable = affordableDayLengths(budget, entries, rates, { excludeEntryId });
  const ok = affordable.some((o) => Number(o.value) === Number(dayLength));
  if (!ok) {
    const err = new Error(
      'Selected shooting day length would exceed the remaining budget for this rate card'
    );
    err.code = 'BUDGET_EXCEEDED';
    throw err;
  }
  return true;
}

export const MARKET_CITIES = [
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Glasgow',
  'Edinburgh',
  'Bristol',
  'Liverpool',
  'Newcastle',
  'Cardiff',
  'Belfast',
  'Other',
];
