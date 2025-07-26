import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes that require authentication
const protectedPaths = [
  '/channels',  // Requires authentication - no more anonymous access
  '/canvas',    // Requires authentication
  '/generate',  // Requires user account
  '/usage',     // User-specific usage data
  '/settings'   // User settings
];

// Note: All features now require authentication - no anonymous access

// Define auth routes that should redirect if already authenticated
const authPaths = ['/sign-in', '/sign-up'];

// Note: /forgot-password and /reset-password are intentionally not in authPaths
// to allow authenticated users to reset their password if needed

// Check if the current path requires authentication
function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some(path => pathname.startsWith(path));
}

// Check if the current path is an auth route
function isAuthPath(pathname: string): boolean {
  return authPaths.some(path => pathname.startsWith(path));
}

// Better Auth middleware handler
export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes and static files
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }
  
  try {
    // Check for Better Auth session cookie
    const sessionToken = request.cookies.get('better-auth.session_token');
    
    // For now, we'll do simple cookie-based checks
    // The actual session validation happens in the API routes
    const hasSession = !!sessionToken;
    
    // Check if user is trying to access protected route without session
    if (isProtectedPath(pathname) && !hasSession) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(signInUrl);
    }
    
    // Redirect authenticated users away from auth pages
    if (isAuthPath(pathname) && hasSession) {
      return NextResponse.redirect(new URL('/channels', request.url));
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Better Auth middleware error:', error);
    // On error, allow the request to continue
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};