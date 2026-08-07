export const STAFF_ROLES = ['admin', 'main_admin'];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(String(role || ''));
}

export function isMainAdmin(actorOrProfile) {
  return String(actorOrProfile?.role || '') === 'main_admin';
}

/** null = no owner filter (main admin); otherwise filter bookings.created_by */
export function ownedByFilter(actor) {
  if (isMainAdmin(actor)) return null;
  return actor?.id || null;
}

export function canAccessBooking(actor, booking) {
  if (!actor?.id || !booking) return false;
  if (isMainAdmin(actor)) return true;
  return booking.created_by === actor.id;
}

export function assertBookingAccess(actor, booking) {
  if (canAccessBooking(actor, booking)) return true;
  const err = new Error('You do not have access to this booking');
  err.status = 403;
  err.code = 'FORBIDDEN';
  throw err;
}
