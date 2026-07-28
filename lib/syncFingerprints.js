/**
 * Shared fingerprints for admin ↔ portal live sync polls.
 */

function stableJson(value) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`)
    .join(',')}}`;
}

export function filesFingerprint(files = [], categoryStatuses = []) {
  const filePart = (files || [])
    .map(
      (f) =>
        `${f.id}:${f.version ?? ''}:${f.status ?? ''}:${f.is_removed ? 1 : 0}:${f.file_size ?? ''}:${f.storage_key ?? ''}:${f.description ?? ''}`
    )
    .sort()
    .join('|');
  const statusPart = (categoryStatuses || [])
    .map((s) => `${s.category}:${s.status}`)
    .sort()
    .join('|');
  return `${filePart}#${statusPart}`;
}

export function scheduleFingerprint(entries = []) {
  return (entries || [])
    .map(
      (e) =>
        `${e.id}:${e.shoot_date || ''}:${e.day_length ?? ''}:${e.city || ''}:${e.applied_rate ?? ''}`
    )
    .sort()
    .join('|');
}

export function sitesFingerprint(entries = []) {
  return (entries || [])
    .map((e) => `${e.id}:${e.type || ''}:${e.site_name || ''}:${e.location || ''}`)
    .sort()
    .join('|');
}

export function permissionsFingerprint(permissions) {
  if (!permissions) return '';
  if (Array.isArray(permissions)) {
    return permissions
      .map((p) => `${p.field_key || p.fieldKey}:${p.permission}`)
      .sort()
      .join('|');
  }
  return Object.keys(permissions)
    .sort()
    .map((k) => `${k}:${permissions[k]}`)
    .join('|');
}

export function portalFingerprint(portal) {
  if (!portal) return '';
  return [
    portal.status || '',
    portal.editing_locked ? 1 : 0,
    portal.manual_unlock ? 1 : 0,
    portal.editable === false ? 0 : 1,
    portal.expires_at || '',
    stableJson(portal.status_portal_editable || {}),
  ].join(':');
}

export function bookingSyncFingerprint({
  booking,
  files,
  categoryStatuses,
  schedule,
  sites,
  permissions,
  portal,
} = {}) {
  return [
    booking?.current_version ?? '',
    filesFingerprint(files, categoryStatuses),
    scheduleFingerprint(schedule),
    sitesFingerprint(sites),
    permissionsFingerprint(permissions),
    portalFingerprint(portal),
  ].join('::');
}

/** Compare two fingerprints and report which parts actually changed. */
export function diffBookingSyncFingerprint(previous, next) {
  const prevParts = String(previous || '').split('::');
  const nextParts = String(next || '').split('::');
  const versionChanged = String(prevParts[0] || '') !== String(nextParts[0] || '');
  const filesChanged = String(prevParts[1] || '') !== String(nextParts[1] || '');
  const scheduleChanged = String(prevParts[2] || '') !== String(nextParts[2] || '');
  const sitesChanged = String(prevParts[3] || '') !== String(nextParts[3] || '');
  const permissionsChanged = String(prevParts[4] || '') !== String(nextParts[4] || '');
  const portalChanged = String(prevParts[5] || '') !== String(nextParts[5] || '');
  const meaningful =
    versionChanged ||
    filesChanged ||
    scheduleChanged ||
    sitesChanged ||
    permissionsChanged ||
    portalChanged;
  return {
    versionChanged,
    filesChanged,
    scheduleChanged,
    sitesChanged,
    permissionsChanged,
    portalChanged,
    meaningful,
  };
}
