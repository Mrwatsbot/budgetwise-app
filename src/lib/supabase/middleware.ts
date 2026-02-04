import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let user = null;
  
  try {
    const response = await supabase.auth.getUser();
    user = response.data.user;
  } catch (error) {
    // If auth check fails (network error, token refresh failure, etc.),
    // log the error but don't redirect to login
    // Let the request proceed and let client-side handle session recovery
    logger.error('Auth middleware error - allowing request to proceed', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error : String(error),
    });
    
    // Return the response without auth check
    // Client-side session recovery will handle this
    return supabaseResponse;
  }

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/transactions', '/budgets', '/debts', '/savings', '/score', '/settings', '/onboarding', '/reports', '/review', '/coaching', '/creator', '/api/debts', '/api/dashboard', '/api/transactions', '/api/budgets', '/api/ai', '/api/reports', '/api/chat', '/api/predictions', '/api/recurring', '/api/category-rules', '/api/stripe'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
