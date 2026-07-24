import { FIELD_LABELS } from '@/lib/constants';

const DELIVERABLE_CATEGORIES = [
  { category: 'media_plan', label: 'Media Plan files' },
  { category: 'site_lists', label: 'Site Lists files' },
  { category: 'creatives', label: 'Creatives files' },
];

function isBlank(value) {
  if (value == null) return true;
  if (typeof value === 'string') return !value.trim();
  return false;
}

function hasCompleteShootRow(entries = []) {
  return (entries || []).some(
    (e) =>
      e.day_length != null &&
      e.day_length !== '' &&
      !isBlank(e.city) &&
      !isBlank(e.shoot_date)
  );
}

function categoryHasFiles(files = [], category) {
  return (files || []).some((f) => f.category === category && !f.is_removed);
}

function categoryNotRequired(categoryStatuses = [], category) {
  return (categoryStatuses || []).some(
    (c) => c.category === category && c.status === 'not_required'
  );
}

/**
 * Detect missing / invalid booking items for pre-lock reminders.
 * @returns {{ key: string, label: string }[]}
 */
export function detectMissingFields({
  booking = {},
  schedule = [],
  files = [],
  categoryStatuses = [],
} = {}) {
  const missing = [];

  const push = (key, label = FIELD_LABELS[key] || key) => {
    missing.push({ key, label });
  };

  if (isBlank(booking.brand)) push('brand');
  if (isBlank(booking.campaign_name)) push('campaign_name', 'Campaign');
  if (isBlank(booking.sb_number)) push('sb_number', 'Reference Number');
  if (booking.budget == null || booking.budget === '') push('budget');
  if (isBlank(booking.currency)) push('currency');

  if (booking.po_required && isBlank(booking.po_number)) {
    push('po_number', 'PO Number');
  }
  if (booking.po_required && !categoryHasFiles(files, 'purchase_order_invoice')) {
    push('po_document', 'PO Document');
  }

  if (isBlank(booking.client_name)) push('client_name', 'Name');
  if (isBlank(booking.client_email)) push('client_email', 'Email');
  if (isBlank(booking.jcd_contact_name)) push('jcd_contact_name');
  if (isBlank(booking.jcd_contact_email)) push('jcd_contact_email');

  if (!hasCompleteShootRow(schedule)) {
    push('schedule', 'At least one complete shoot row');
  }

  if (isBlank(booking.format_type)) push('format_type', 'Format Type');
  if (
    booking.format_type === 'Other' &&
    isBlank(booking.format_type_other)
  ) {
    push('format_type_other', 'Format type (other) details');
  }
  if (isBlank(booking.campaign_start)) push('campaign_start', 'Campaign Start Date');
  if (isBlank(booking.campaign_end)) push('campaign_end', 'Campaign End Date');
  if (
    booking.campaign_start &&
    booking.campaign_end &&
    String(booking.campaign_end).slice(0, 10) < String(booking.campaign_start).slice(0, 10)
  ) {
    push('campaign_end', 'Campaign End Date (must be on/after start)');
  }

  for (const { category, label } of DELIVERABLE_CATEGORIES) {
    if (categoryNotRequired(categoryStatuses, category)) continue;
    if (!categoryHasFiles(files, category)) {
      push(`file:${category}`, label);
    }
  }

  return missing;
}

export function formatMissingItemsList(missing = []) {
  if (!missing.length) return 'None — booking looks complete.';
  return missing.map((m) => `• ${m.label}`).join('\n');
}
