import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { NEXT_PUBLIC_SUPABASE_URL } from './services/database/supabase/frontend-config';
import { handleServerErrorRedirect } from './shared/utils';
import { SUPABASE_SERVICE_ROLE_KEY } from './services/database/supabase/backend-config';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const redirect = new URL(request.url);
  const { pathname } = redirect;

  // turn off middleware for the root path
  if (pathname === '/') return response;

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    return handleServerErrorRedirect(
      error ||
        new Error('unauthenticated response from getUser() in middleware'),
      redirect
    );
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - statement/privacy (privacy statement)
     * - statement/terms-of-service (terms of service statement)
     * - auth/ (all routes starting with auth/)
     * - error/ (all routes starting with error/)
     * - any file with extensions: svg, png, jpg, jpeg, gif, webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|statement/privacy|statement/terms-of-service|auth/.*|error*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
