import { requireAdmin, jsonOk, jsonError } from '@/lib/api';
import { createServiceClient } from '@/lib/supabase/admin';
import { clientDisplayName } from '@/utils/helpers';

export async function GET(request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const action = searchParams.get('action');
    const actor = searchParams.get('actor');
    const q = searchParams.get('q');
    const role = searchParams.get('role') || 'client'; // client | admin | all
    const limit = Number(searchParams.get('limit') || 200);

    const supabase = createServiceClient();

    const { data: booking } = await supabase
      .from('bookings')
      .select('client_name, client_company, client_email')
      .eq('id', id)
      .maybeSingle();

    const fallbackClientName = clientDisplayName(booking || {});

    let query = supabase
      .from('activity_entries')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (role === 'client') query = query.eq('actor_role', 'client');
    if (role === 'admin') query = query.eq('actor_role', 'admin');
    // role=all returns every stored entry (including historical admin rows)

    if (section) query = query.eq('section', section);
    if (action) query = query.eq('action', action);
    if (actor) query = query.ilike('actor_name', `%${actor}%`);
    if (q) {
      query = query.or(
        `action.ilike.%${q}%,field_name.ilike.%${q}%,actor_name.ilike.%${q}%,section.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return jsonError(error.message, 500);

    const entries = (data || []).map((row) => ({
      ...row,
      actor_name:
        row.actor_role === 'client' && (!row.actor_name || row.actor_name === 'Client')
          ? fallbackClientName
          : row.actor_name,
      client_name: booking?.client_name || null,
      client_company: booking?.client_company || null,
      client_email: booking?.client_email || null,
    }));

    return jsonOk(entries);
  } catch (err) {
    return jsonError(err.message, 500);
  }
}
