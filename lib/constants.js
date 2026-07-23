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
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'CHF', label: 'CHF — Swiss Franc' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar' },
];

export const SHOOT_FORMATS = [
  '48-Sheet',
  '6-Sheet',
  'Digital 48-Sheet',
  'Custom Size',
];

export const FILE_CATEGORIES = [
  { value: 'campaign_artwork', label: 'Campaign Artwork' },
  { value: 'brand_guidelines', label: 'Brand Guidelines' },
  { value: 'reference_mood', label: 'Reference / Mood Images' },
  { value: 'purchase_order_invoice', label: 'Purchase Order / Invoice' },
  { value: 'other_documents', label: 'Other Documents' },
];

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
 * Assumption (open decision §19): campaign/client/schedule/sites/invoice/files/notes
 * are editable; JCD contact and budget are readonly; internal notes / portal / status hidden.
 */
export const DEFAULT_FIELD_PERMISSIONS = {
  sb_number: 'readonly',
  currency: 'readonly',
  budget: 'readonly',
  campaign_name: 'editable',
  city_market: 'editable',
  client_company: 'editable',
  client_name: 'editable',
  client_email: 'editable',
  jcd_contact_name: 'readonly',
  jcd_contact_email: 'readonly',
  cc_emails: 'readonly',
  schedule: 'editable',
  sites: 'editable',
  mpc_chooses_sites: 'editable',
  po_required: 'editable',
  po_received: 'editable',
  po_number: 'editable',
  payment_terms: 'editable',
  billing_address: 'editable',
  invoice_notes: 'editable',
  client_notes: 'editable',
  files: 'editable',
  internal_notes: 'hidden',
  status: 'hidden',
  portal: 'hidden',
};

export const BOOKING_FIELD_KEYS = Object.keys(DEFAULT_FIELD_PERMISSIONS);

export const BOOKING_SECTIONS = [
  { key: 'reference', label: 'Reference & Budget', fields: ['sb_number', 'currency', 'budget'] },
  {
    key: 'client',
    label: 'Client & Campaign',
    fields: ['campaign_name', 'city_market', 'client_company', 'client_name', 'client_email'],
  },
  {
    key: 'jcd_contact',
    label: 'JCD Contact',
    fields: ['jcd_contact_name', 'jcd_contact_email', 'cc_emails'],
  },
  { key: 'schedule', label: 'Shoot Schedule & Live Dates', fields: ['schedule'] },
  { key: 'sites', label: 'Sites', fields: ['mpc_chooses_sites', 'sites'] },
  {
    key: 'invoice',
    label: 'Invoice & Purchase Order',
    fields: [
      'po_required',
      'po_received',
      'po_number',
      'payment_terms',
      'billing_address',
      'invoice_notes',
    ],
  },
  { key: 'notes', label: 'Notes', fields: ['client_notes', 'internal_notes'] },
  { key: 'files', label: 'Files & Assets', fields: ['files'] },
];

export const FIELD_LABELS = {
  sb_number: 'SB Number',
  currency: 'Currency',
  budget: 'Budget',
  campaign_name: 'Campaign Name',
  city_market: 'City / Market',
  client_company: 'Client Company',
  client_name: 'JCD Independent Client Name',
  client_email: 'JCD Independent Client Email',
  jcd_contact_name: 'JCD Contact Name',
  jcd_contact_email: 'JCD Contact Email',
  cc_emails: 'CC Emails',
  schedule: 'Shoot Schedule',
  sites: 'Sites',
  mpc_chooses_sites: 'MPC Chooses Sites',
  po_required: 'PO Required',
  po_received: 'PO Received',
  po_number: 'PO Number',
  payment_terms: 'Payment Terms',
  billing_address: 'Billing Address',
  invoice_notes: 'Miscellaneous Invoice Notes',
  client_notes: 'Client Notes',
  internal_notes: 'Internal Notes',
  files: 'Files & Assets',
  status: 'Booking Status',
  portal: 'Portal Controls',
};

export const ADMIN_NOTIFICATION_TYPES = [
  'client_opened_portal',
  'client_updated_booking',
  'client_uploaded_files',
  'client_removed_file',
  'client_completed_required',
  'portal_pin_locked',
];

export const CLIENT_NOTIFICATION_TYPES = [
  'portal_link_sent',
  'pin_sent',
  'admin_requested_info',
  'file_status_changed',
  'booking_updated_by_admin',
  'booking_submitted',
];
