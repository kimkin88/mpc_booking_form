import { createClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/adminSession';
import { jsonOk, jsonError } from '@/lib/api';

function publicUser(session) {
  return {
    id: session.user.id,
    email: session.user.email,
    username: session.user.email,
    name: session.user.name,
    role: session.user.role || session.profile?.role || 'admin',
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || body.username || body.login || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return jsonError('Email and password are required', 400);
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return jsonError('Invalid email or password', 401, { code: 'INVALID_CREDENTIALS' });
    }

    const session = await getAdminSession();
    if (!session) {
      await supabase.auth.signOut();
      return jsonError('This account is not an admin', 403, { code: 'NOT_ADMIN' });
    }

    return jsonOk({ user: publicUser(session) });
  } catch (err) {
    return jsonError(err.message || 'Login failed', 500);
  }
}

export async function PATCH(request) {
  try {
    const session = await getAdminSession();
    if (!session) return jsonError('Unauthorized', 401);

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword) {
      return jsonError('Current and new password are required', 400);
    }

    if (newPassword !== confirmPassword) {
      return jsonError('New password confirmation does not match', 400, {
        code: 'CONFIRM_MISMATCH',
      });
    }

    if (String(newPassword).length < 6) {
      return jsonError('New password must be at least 6 characters', 400, {
        code: 'WEAK_PASSWORD',
      });
    }

    const supabase = await createClient();
    const email = session.user.email;

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (reauthError) {
      return jsonError('Current password is incorrect', 400, {
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return jsonError(updateError.message || 'Failed to change password', 400);
    }

    return jsonOk({ changed: true });
  } catch (err) {
    return jsonError(err.message || 'Failed to change password', 500);
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return jsonOk({ signedOut: true });
  } catch (err) {
    return jsonError(err.message || 'Sign out failed', 500);
  }
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) return jsonError('Unauthorized', 401);
  return jsonOk({ user: publicUser(session) });
}
