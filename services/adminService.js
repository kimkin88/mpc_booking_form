import { createServiceClient } from '@/lib/supabase/admin';
import { isMainAdmin, isStaffRole } from '@/lib/adminAccess';

export async function listAdmins() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .in('role', ['admin', 'main_admin'])
    .order('full_name', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function createAdmin(
  { email, password, fullName = null, role = 'admin' } = {},
  actor
) {
  if (!isMainAdmin(actor)) {
    const err = new Error('Only a main admin can create admins');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const normalizedPassword = String(password || '');
  const name = String(fullName || '').trim() || null;
  const nextRole = role || 'admin';

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    const err = new Error('A valid email is required');
    err.status = 400;
    err.code = 'INVALID_EMAIL';
    throw err;
  }
  if (normalizedPassword.length < 6) {
    const err = new Error('Password must be at least 6 characters');
    err.status = 400;
    err.code = 'WEAK_PASSWORD';
    throw err;
  }
  if (!isStaffRole(nextRole)) {
    const err = new Error('Role must be admin or main_admin');
    err.status = 400;
    err.code = 'INVALID_ROLE';
    throw err;
  }

  const supabase = createServiceClient();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: normalizedPassword,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  });

  if (createError) {
    const msg = createError.message || 'Could not create admin';
    const err = new Error(
      /already|registered|exists/i.test(msg) ? 'An account with this email already exists' : msg
    );
    err.status = 400;
    err.code = 'CREATE_FAILED';
    throw err;
  }

  const userId = created?.user?.id;
  if (!userId) {
    const err = new Error('Admin user was not created');
    err.status = 500;
    err.code = 'CREATE_FAILED';
    throw err;
  }

  // Trigger creates profile as admin; set name/role explicitly.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: normalizedEmail,
        full_name: name || normalizedEmail,
        role: nextRole,
      },
      { onConflict: 'id' }
    )
    .select('id, email, full_name, role, created_at')
    .single();

  if (profileError) throw profileError;
  return profile;
}

export async function updateAdminRole(targetId, nextRole, actor) {
  if (!isMainAdmin(actor)) {
    const err = new Error('Only a main admin can change roles');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (!isStaffRole(nextRole)) {
    const err = new Error('Role must be admin or main_admin');
    err.status = 400;
    err.code = 'INVALID_ROLE';
    throw err;
  }

  const supabase = createServiceClient();

  const { data: target, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', targetId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!target) {
    const err = new Error('Admin not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (target.role === 'main_admin' && nextRole !== 'main_admin') {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'main_admin');
    if (countError) throw countError;
    if ((count || 0) <= 1) {
      const err = new Error('Cannot demote the last main admin');
      err.status = 400;
      err.code = 'LAST_MAIN_ADMIN';
      throw err;
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: nextRole })
    .eq('id', targetId)
    .select('id, email, full_name, role, created_at')
    .single();

  if (error) throw error;
  return data;
}
