import { DEFAULT_FIELD_PERMISSIONS } from '@/lib/constants';

/**
 * Resolve effective permission for a field on a booking.
 * @param {Record<string, string>} permissionsMap - field_key → permission
 * @param {string} fieldKey
 * @returns {'hidden'|'readonly'|'editable'|'required'}
 */
export function getFieldPermission(permissionsMap, fieldKey) {
  if (permissionsMap && permissionsMap[fieldKey]) {
    return permissionsMap[fieldKey];
  }
  return DEFAULT_FIELD_PERMISSIONS[fieldKey] || 'hidden';
}

export function canClientView(permission) {
  return permission !== 'hidden';
}

export function canClientEdit(permission) {
  return permission === 'editable' || permission === 'required';
}

export function isFieldRequired(permission) {
  return permission === 'required';
}

/**
 * Build portal UI maps from a permissions map.
 * @param {Record<string, string>} permissionsMap
 * @param {boolean} portalEditable - false when portal is locked/disabled
 */
export function buildClientFieldState(permissionsMap = {}, portalEditable = true) {
  const fieldHidden = {};
  const fieldDisabled = {};
  const fieldRequired = {};

  Object.keys(DEFAULT_FIELD_PERMISSIONS).forEach((key) => {
    const perm = getFieldPermission(permissionsMap, key);
    fieldHidden[key] = !canClientView(perm);
    fieldDisabled[key] = !canClientEdit(perm) || !portalEditable;
    fieldRequired[key] = isFieldRequired(perm);
  });

  return { fieldHidden, fieldDisabled, fieldRequired };
}

/**
 * Filter a booking payload for client portal responses.
 * Removes internal notes and fields marked hidden.
 */
export function filterBookingForClient(booking, permissionsMap) {
  if (!booking) return null;

  const {
    internal_notes: _internal,
    created_by: _createdBy,
    ...safe
  } = booking;

  const result = { ...safe };

  delete result.internal_notes;

  Object.keys(DEFAULT_FIELD_PERMISSIONS).forEach((key) => {
    const perm = getFieldPermission(permissionsMap, key);
    if (!canClientView(perm) && key in result) {
      delete result[key];
    }
  });

  return result;
}

/**
 * Validate that a client update only touches permitted fields.
 * Returns { allowed: object, rejected: string[] }
 */
export function sanitizeClientUpdate(payload, permissionsMap) {
  const allowed = {};
  const rejected = [];

  const editableBookingFields = [
    'campaign_name',
    'city_market',
    'client_company',
    'client_name',
    'client_email',
    'jcd_contact_name',
    'jcd_contact_email',
    'cc_emails',
    'mpc_chooses_sites',
    'po_required',
    'po_received',
    'po_number',
    'payment_terms',
    'billing_address',
    'invoice_notes',
    'client_notes',
    'currency',
    'budget',
  ];

  for (const key of Object.keys(payload)) {
    if (!editableBookingFields.includes(key)) {
      rejected.push(key);
      continue;
    }
    const perm = getFieldPermission(permissionsMap, key);
    if (!canClientEdit(perm)) {
      rejected.push(key);
      continue;
    }
    allowed[key] = payload[key];
  }

  return { allowed, rejected };
}

export function permissionsArrayToMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    map[row.field_key] = row.permission;
  });
  return map;
}

export function buildDefaultPermissionRows(portalAccessId) {
  return Object.entries(DEFAULT_FIELD_PERMISSIONS).map(([field_key, permission]) => ({
    portal_access_id: portalAccessId,
    field_key,
    permission,
  }));
}
