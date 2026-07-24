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

  // Structural / non-booking columns — handled by dedicated APIs
  const structural = new Set(['schedule', 'sites', 'files', 'portal', 'status']);
  // Never client-writable even if misconfigured
  const blocked = new Set([
    'id',
    'created_at',
    'updated_at',
    'created_by',
    'current_version',
    'internal_notes',
    'delivery_date_override',
    'half_day_rate',
    'full_day_rate',
    'rate_card_label',
    'mpc_owner_name',
    'mpc_backup_owner_name',
    'auto_lock_enabled',
    'calculated_delivery_date',
    'in_charge_reference',
    'in_charge_period_start',
    'in_charge_period_end',
    'portal_lock_date',
    'sb_number',
  ]);

  for (const key of Object.keys(payload)) {
    if (structural.has(key) || blocked.has(key)) {
      rejected.push(key);
      continue;
    }
    if (!(key in DEFAULT_FIELD_PERMISSIONS)) {
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
