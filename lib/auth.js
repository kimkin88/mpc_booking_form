import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/adminSession';

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect('/login');
  return session.actor;
}
