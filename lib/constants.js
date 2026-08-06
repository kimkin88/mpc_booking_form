/** Application constants and enums matching the database schema */

export const BOOKING_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'waiting_for_client', label: 'Waiting for Client' },
  { value: 'client_updating', label: 'Client Updating' },
  { value: 'ready_for_review', label: 'Ready for Review' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_production', label: 'In Production' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Default: portal stays editable through review/changes; locks after approval.
 * Admins can override per portal via status_portal_editable.
 */
export const DEFAULT_STATUS_PORTAL_EDITABLE = Object.fromEntries(
  BOOKING_STATUSES.map(({ value }) => [
    value,
    !['approved', 'in_production', 'completed', 'archived', 'cancelled'].includes(value),
  ])
);

export const PORTAL_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'locked', label: 'Locked' },
  { value: 'expired', label: 'Expired' },
  { value: 'disabled', label: 'Disabled' },
];

export const FIELD_PERMISSIONS = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'readonly', label: 'Read-only' },
  { value: 'editable', label: 'Editable' },
  { value: 'required', label: 'Required' },
];

export const CURRENCIES = [
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
];

/** Upper bound for photography shoot budget (excludes media-buy totals). */
export const MAX_SHOOT_BUDGET = 20000;

export const FORMAT_TYPES = [
  { value: 'Digital', label: 'Digital' },
  { value: 'Paper', label: 'Paper' },
  { value: 'Both', label: 'Both' },
  { value: 'Other', label: 'Other' },
];

/** @deprecated Prefer FORMAT_TYPES for deliverables */
export const SHOOT_FORMATS = [
  '48-Sheet',
  '6-Sheet',
  'Digital 48-Sheet',
  'Custom Size',
];

export const FILE_CATEGORIES = [
  { value: 'purchase_order_invoice', label: 'Purchase Order' },
  { value: 'media_plan', label: 'Media Plan' },
  { value: 'site_lists', label: 'Site Lists' },
  { value: 'creatives', label: 'Creatives' },
  { value: 'campaign_artwork', label: 'Campaign Artwork' },
  { value: 'brand_guidelines', label: 'Brand Guidelines' },
  { value: 'reference_mood', label: 'Reference / Mood Images' },
  { value: 'other_documents', label: 'Other Documents' },
];

export const PO_FILE_CATEGORIES = FILE_CATEGORIES.filter(
  (c) => c.value === 'purchase_order_invoice'
);

export const DELIVERABLE_FILE_CATEGORIES = FILE_CATEGORIES.filter((c) =>
  ['media_plan', 'site_lists', 'creatives'].includes(c.value)
);

export const FILE_STATUSES = [
  { value: 'missing', label: 'Missing' },
  { value: 'requested', label: 'Requested' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'not_required', label: 'Not Required' },
];

export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

export const ALLOWED_EXTENSIONS_LABEL =
  'Images (JPG, PNG, GIF, WebP, SVG, TIFF), PDF, Word, Excel, PowerPoint, CSV, TXT, ZIP, RAR, 7Z';

export const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES) || 25 * 1024 * 1024;

/** Whole-number MB label for UI copy (matches server limit default / env). */
export const MAX_FILE_SIZE_MB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));

/**
 * Default field-level client permissions for a newly generated portal.
 */
export const DEFAULT_FIELD_PERMISSIONS = {
  brand: 'editable',
  campaign_name: 'editable',
  sb_number: 'readonly',
  currency: 'editable',
  budget: 'editable',
  po_number: 'editable',
  client_name: 'required',
  client_email: 'required',
  cc_emails: 'editable',
  jcd_contact_name: 'editable',
  jcd_contact_email: 'editable',
  schedule: 'required',
  format_type: 'required',
  format_type_other: 'editable',
  campaign_start: 'required',
  campaign_end: 'required',
  client_notes: 'editable',
  files: 'editable',
  calculated_delivery_date: 'hidden',
  delivery_date_override: 'hidden',
  in_charge_reference: 'readonly',
  portal_lock_date: 'readonly',
  city_market: 'hidden',
  client_company: 'hidden',
  mpc_chooses_sites: 'hidden',
  sites: 'hidden',
  po_required: 'hidden',
  po_received: 'hidden',
  payment_terms: 'hidden',
  billing_address: 'hidden',
  invoice_notes: 'hidden',
  internal_notes: 'hidden',
  half_day_rate: 'readonly',
  full_day_rate: 'readonly',
  rate_card_label: 'readonly',
  mpc_owner_name: 'hidden',
  mpc_backup_owner_name: 'hidden',
  use_remaining_for_extra_shots: 'editable',
  status: 'hidden',
  portal: 'hidden',
};

export const BOOKING_FIELD_KEYS = Object.keys(DEFAULT_FIELD_PERMISSIONS);

export const BOOKING_SECTIONS = [
  {
    key: 'campaign',
    label: 'Brand and commercial details',
    fields: ['brand', 'campaign_name', 'sb_number', 'budget', 'currency', 'po_number'],
  },
  {
    key: 'contact',
    label: 'Client and JCD contacts',
    fields: [
      'client_name',
      'client_email',
      'cc_emails',
      'jcd_contact_name',
      'jcd_contact_email',
    ],
  },
  { key: 'schedule', label: 'Shoot requirements', fields: ['schedule'] },
  {
    key: 'deliverables',
    label: 'Format, campaign dates, files and notes',
    fields: [
      'format_type',
      'format_type_other',
      'campaign_start',
      'campaign_end',
      'files',
      'client_notes',
      'in_charge_reference',
      'portal_lock_date',
    ],
  },
];

export const FIELD_LABELS = {
  brand: 'Brand',
  campaign_name: 'Campaign',
  sb_number: 'Reference Number',
  currency: 'Currency',
  budget: 'Budget',
  po_number: 'PO Number',
  client_name: 'Name',
  client_email: 'Email',
  cc_emails: 'Team Email / CC Emails',
  jcd_contact_name: 'JCD Contact Name',
  jcd_contact_email: 'JCD Contact Email',
  schedule: 'Shoot requirements',
  format_type: 'Format Type',
  format_type_other: 'Format type (other)',
  campaign_start: 'Campaign Start Date',
  campaign_end: 'Campaign End Date',
  client_notes: 'Additional Notes',
  files: 'Files',
  calculated_delivery_date: 'Delivery due date',
  delivery_date_override: 'Delivery date override',
  in_charge_reference: 'In-Charge Reference',
  portal_lock_date: 'Portal lock date',
  city_market: 'City / Market',
  client_company: 'Client Company',
  sites: 'Sites',
  mpc_chooses_sites: 'MPC Chooses Sites',
  po_required: 'PO Required',
  po_received: 'PO Received',
  payment_terms: 'Payment Terms',
  billing_address: 'Billing Address',
  invoice_notes: 'Miscellaneous Invoice Notes',
  internal_notes: 'Internal Notes',
  half_day_rate: 'Half-day rate',
  full_day_rate: 'Full-day rate',
  rate_card_label: 'Rate card',
  mpc_owner_name: 'MPC Booking Owner',
  mpc_backup_owner_name: 'MPC Backup Owner',
  use_remaining_for_extra_shots: 'Use remaining balance for extra shots',
  status: 'Booking Status',
  portal: 'Portal Controls',
};

export const CLIENT_NOTIFICATION_TYPES = [
  'portal_link_sent',
  'pin_sent',
  'admin_requested_info',
  'file_status_changed',
  'booking_updated_by_admin',
  'booking_submitted',
  'reminder_sent',
];

export const ADMIN_NOTIFICATION_TYPES = [
  'client_opened_portal',
  'client_updated_booking',
  'client_uploaded_files',
  'client_removed_file',
  'client_completed_required',
  'portal_pin_locked',
  'reminder_failed',
];
