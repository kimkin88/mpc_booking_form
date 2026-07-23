import { createClient } from '@/lib/supabase/server';

/**
 * Resolve the signed-in Supabase user and require profiles.role = 'admin'.
 * Returns null when unauthenticated or not an admin.
 */
export async function getAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') return null;

  const name = profile.full_name || user.email || 'Admin';

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.email,
      name,
      role: 'admin',
    },
    profile: {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
    },
    actor: {
      id: user.id,
      email: user.email,
      name,
      role: 'admin',
    },
  };
}
