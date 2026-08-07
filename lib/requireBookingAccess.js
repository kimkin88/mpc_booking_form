import { requireAdmin, jsonError } from '@/lib/api';
import { assertBookingAccess } from '@/lib/adminAccess';
import { getBooking } from '@/services/bookingService';

/**
 * Require admin session and access to the booking.
 * Returns { error } or { ...auth, data } where data is getBooking result.
 */
export async function requireBookingAccess(bookingId) {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  try {
    const data = await getBooking(bookingId);
    assertBookingAccess(auth.actor, data.booking);
    return { ...auth, data };
  } catch (err) {
    if (err.code === 'FORBIDDEN' || err.status === 403) {
      return { error: jsonError(err.message || 'Forbidden', 403, { code: 'FORBIDDEN' }) };
    }
    const status = err.code === 'PGRST116' ? 404 : err.status || 500;
    return { error: jsonError(err.message || 'Not found', status, { code: err.code }) };
  }
}
