/**
 * Deep-ish comparison helpers for conflict detection and activity diffs.
 */

export function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => valuesEqual(item, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object' && a && b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      if (!valuesEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return String(a) === String(b);
}

export function diffObjects(previous, next, fields) {
  const changes = [];
  const keys = fields || new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]);
  for (const field of keys) {
    const prev = previous?.[field];
    const curr = next?.[field];
    if (!valuesEqual(prev, curr)) {
      changes.push({ field, previous: prev ?? null, next: curr ?? null });
    }
  }
  return changes;
}

/**
 * Human-readable client label for activity logs and actor attribution.
 */
export function clientDisplayName(booking = {}) {
  const name = String(booking.client_name || '').trim();
  const company = String(booking.client_company || '').trim();
  const email = String(booking.client_email || '').trim();

  if (name && company) return `${name} · ${company}`;
  if (name) return name;
  if (company) return company;
  if (email) return email;
  return 'Client';
}

export function clientActorFromBooking(booking = {}) {
  return {
    id: null,
    name: clientDisplayName(booking),
    role: 'client',
  };
}
