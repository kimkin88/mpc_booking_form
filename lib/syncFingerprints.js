/**
 * Shared fingerprints for admin ↔ portal live sync polls.
 */

export function filesFingerprint(files = [], categoryStatuses = []) {
  const filePart = (files || [])
    .map(
      (f) =>
        `${f.id}:${f.version ?? ''}:${f.status ?? ''}:${f.is_removed ? 1 : 0}:${f.file_size ?? ''}:${f.created_at ?? ''}:${f.storage_key ?? ''}`
    )
    .sort()
    .join('|');
  const statusPart = (categoryStatuses || [])
    .map((s) => `${s.category}:${s.status}:${s.updated_at || ''}`)
    .sort()
    .join('|');
  return `${filePart}#${statusPart}`;
}

export function scheduleFingerprint(entries = []) {
  return (entries || [])
    .map(
      (e) =>
        `${e.id}:${e.shoot_date || ''}:${e.day_length ?? ''}:${e.city || ''}:${e.applied_rate ?? ''}:${e.updated_at || e.created_at || ''}`
    )
    .sort()
    .join('|');
}

export function sitesFingerprint(entries = []) {
  return (entries || [])
    .map(
      (e) =>
        `${e.id}:${e.type || ''}:${e.site_name || ''}:${e.updated_at || e.created_at || ''}`
    )
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
    JSON.stringify(portal.status_portal_editable || {}),
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
