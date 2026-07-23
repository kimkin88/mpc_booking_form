import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import { createServiceClient } from '@/lib/supabase/admin';
import { buildPortalUrl } from '@/lib/crypto';

export async function GET(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';

    const supabase = createServiceClient();

    let query = supabase
      .from('portal_access')
      .select(`
        id,
        booking_id,
        access_token,
        status,
        editing_locked,
        expires_at,
        first_opened_at,
        last_opened_at,
        created_at,
        regenerated_at,
        failed_pin_attempts,
        pin_locked_until,
        bookings!inner (
          id,
          sb_number,
          campaign_name,
          client_company,
          client_name,
          client_email,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(
        `bookings.sb_number.ilike.%${search}%,bookings.campaign_name.ilike.%${search}%,bookings.client_company.ilike.%${search}%`,
        { referencedTable: 'bookings' }
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const links = (data || []).map((row) => {
      const booking = row.bookings;
      return {
        id: row.id,
        booking_id: row.booking_id,
        status: row.status,
        editing_locked: row.editing_locked,
        expires_at: row.expires_at,
        first_opened_at: row.first_opened_at,
        last_opened_at: row.last_opened_at,
        created_at: row.created_at,
        regenerated_at: row.regenerated_at,
        failed_pin_attempts: row.failed_pin_attempts,
        pin_locked_until: row.pin_locked_until,
        url: row.access_token ? buildPortalUrl(row.access_token, request) : null,
        sb_number: booking?.sb_number,
        campaign_name: booking?.campaign_name,
        client_company: booking?.client_company,
        client_name: booking?.client_name,
        client_email: booking?.client_email,
        booking_status: booking?.status,
      };
    });

    return jsonOk(links);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
