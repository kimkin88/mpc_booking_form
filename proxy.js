import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Refresh Supabase auth cookies on app routes.
     * Skip Next internals and common static assets.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
