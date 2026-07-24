import { holidaySet } from '@/lib/holidays';

/** Lead times in working days by format type (extensible per client later). */
export const FORMAT_DELIVERY_LEAD_DAYS = {
  Digital: 5,
  Paper: 8,
  Both: 8,
  Other: null, // TBC until admin confirms
};

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

function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Subtract `workingDays` working days from a date (excludes weekends + holidays).
 */
export function subtractWorkingDays(fromDate, workingDays, holidays = holidaySet()) {
  const start = parseDateOnly(fromDate);
  if (!start || !Number.isFinite(Number(workingDays)) || workingDays < 0) return null;

  let remaining = Number(workingDays);
  const cursor = new Date(start.getTime());

  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const key = toDateOnly(cursor);
    if (isWeekend(cursor) || holidays.has(key)) continue;
    remaining -= 1;
  }

  return toDateOnly(cursor);
}

/**
 * @returns {{
 *   status: 'calculated'|'tbc'|'missing',
 *   date: string|null,
 *   leadDays: number|null,
 *   label: string,
 * }}
 */
export function calculateDeliveryDate(formatType, campaignStartDate, options = {}) {
  const holidays = holidaySet(options.extraHolidays || []);
  const rules = options.leadDaysByFormat || FORMAT_DELIVERY_LEAD_DAYS;

  if (!campaignStartDate) {
    return {
      status: 'missing',
      date: null,
      leadDays: null,
      label: 'Set campaign start date to calculate delivery',
    };
  }

  const normalized = String(formatType || '').trim();
  if (!normalized) {
    return {
      status: 'missing',
      date: null,
      leadDays: null,
      label: 'Select format type to calculate delivery',
    };
  }

  // Custom "Other" text still counts as Other → TBC
  const ruleKey = Object.prototype.hasOwnProperty.call(rules, normalized)
    ? normalized
    : 'Other';
  const leadDays = rules[ruleKey];

  if (leadDays == null) {
    return {
      status: 'tbc',
      date: null,
      leadDays: null,
      label: 'TBC — MPC will confirm delivery date for Other formats',
    };
  }

  const date = subtractWorkingDays(campaignStartDate, leadDays, holidays);
  return {
    status: 'calculated',
    date,
    leadDays,
    label: `Calculated (${leadDays} working days before campaign start)`,
  };
}

export function effectiveDeliveryDate(booking = {}) {
  if (booking.delivery_date_override) {
    return {
      date: booking.delivery_date_override,
      status: 'override',
      label: 'Admin override',
    };
  }
  return calculateDeliveryDate(booking.format_type, booking.campaign_start);
}
