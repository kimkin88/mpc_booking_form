import { requireAdmin, jsonOk, jsonCreated, jsonError } from '@/lib/api';
import { isMainAdmin } from '@/lib/adminAccess';
import { listAdmins, createAdmin, updateAdminRole } from '@/services/adminService';

/** List staff profiles. Available to any admin (for assign-to); role changes are main-only. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const admins = await listAdmins();
    return jsonOk({
      admins,
      canManageRoles: isMainAdmin(auth.actor),
      canCreateAdmins: isMainAdmin(auth.actor),
    });
  } catch (err) {
    return jsonError(err.message, 500);
  }
}

export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  if (!isMainAdmin(auth.actor)) {
    return jsonError('Only a main admin can create admins', 403, { code: 'FORBIDDEN' });
  }

  try {
    const body = await request.json();
    const profile = await createAdmin(
      {
        email: body.email,
        password: body.password,
        fullName: body.full_name || body.fullName || body.name,
        role: body.role || 'admin',
      },
      auth.actor
    );
    return jsonCreated(profile);
  } catch (err) {
    return jsonError(err.message, err.status || 500, { code: err.code });
  }
}

export async function PATCH(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  if (!isMainAdmin(auth.actor)) {
    return jsonError('Only a main admin can change roles', 403, { code: 'FORBIDDEN' });
  }

  try {
    const body = await request.json();
    const id = body.id || body.userId;
    const role = body.role;
    if (!id || !role) return jsonError('id and role are required', 400);

    const updated = await updateAdminRole(id, role, auth.actor);
    return jsonOk(updated);
  } catch (err) {
    return jsonError(err.message, err.status || 500, { code: err.code });
  }
}
