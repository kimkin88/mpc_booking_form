import { requireAdmin, jsonOk, jsonCreated, jsonError } from '@/lib/api';
import { ownedByFilter } from '@/lib/adminAccess';
import { validateCreateBooking } from '@/lib/validation';
import { createBooking, listBookings, generateNextSbNumber } from '@/services/bookingService';

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || null;
  const sort = searchParams.get('sort') || 'updated_desc';
  const suggestSb = searchParams.get('suggestSb') === '1';
  const page = Number(searchParams.get('page') || 1);
  const pageSize = Number(searchParams.get('pageSize') || 20);

  try {
    if (suggestSb) {
      const sb_number = await generateNextSbNumber();
      return jsonOk({ sb_number });
    }

    const data = await listBookings({
      search,
      status,
      page,
      pageSize,
      sort,
      createdBy: ownedByFilter(auth.actor),
    });
    return jsonOk(data);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();

    // Auto-generate SB Number when omitted or blank
    if (!body.sb_number || !String(body.sb_number).trim()) {
      body.sb_number = await generateNextSbNumber();
    }

    const validation = validateCreateBooking(body);
    if (!validation.success) {
      return jsonError(validation.error.issues?.[0]?.message || 'Validation failed', 400, {
        issues: validation.error.issues,
      });
    }

    const booking = await createBooking(validation.data, auth.actor);
    return jsonCreated(booking);
  } catch (err) {
    if (err.code === 'DUPLICATE_SB') return jsonError(err.message, 409, { code: err.code });
    return jsonError(err.message, 500);
  }
}
