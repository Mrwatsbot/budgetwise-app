import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Public routes that don't need Supabase auth
const publicRoutes = ['/', '/demo', '/login', '/signup', '/setup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip Supabase session for public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
