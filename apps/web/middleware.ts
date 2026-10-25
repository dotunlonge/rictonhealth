import { NextResponse, type NextRequest } from 'next/server';

// Route protection (defense-in-depth).
//
// The access token lives in JS memory and the refresh token in sessionStorage,
// so middleware cannot see credentials — it routes on two NON-SENSITIVE hint
// cookies (`ricton_session`, `ricton_role`) set at login. Forging them only
// renders app chrome: every data call still requires the real token and the
// API (requireAuth on all routes) 401s back to /login. True authorization
// stays server-side; this layer stops unauthenticated rendering + casual
// wrong-role navigation with zero content flash.

const AUTH_PAGES = ['/login', '/register', '/verify-otp', '/oauth/select-role'];

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/appointments',
  '/prescriptions',
  '/wallet',
  '/rewards',
  '/inbox',
  '/notifications',
  '/patients',
  '/providers',
  '/referrals',
  '/telemedicine',
  '/pharmacy',
  '/subscription',
  '/support',
  '/settings',
  '/onboarding',
  '/admin',
];

function hasSession(req: NextRequest): boolean {
  return req.cookies.get('ricton_session')?.value === '1';
}

function sessionRole(req: NextRequest): string | null {
  const raw = req.cookies.get('ricton_role')?.value;
  return raw ? decodeURIComponent(raw) : null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = hasSession(req);

  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isAuthPage) {
    const isExplicitAuthAction =
      req.nextUrl.searchParams.has('expired') ||
      req.nextUrl.searchParams.has('logout') ||
      req.nextUrl.searchParams.has('force');

    if (isExplicitAuthAction) {
      const res = NextResponse.next();
      res.cookies.delete('ricton_session');
      res.cookies.delete('ricton_role');
      return res;
    }

    if (authed) {
      const role = sessionRole(req);
      const home =
        role === 'SUPER_ADMIN'
          ? '/admin'
          : role === 'HOSPITAL_ADMIN'
            ? '/dashboard/hospital'
            : role === 'PHARMACIST'
              ? '/dashboard/pharmacy'
              : '/dashboard';
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isProtected) return NextResponse.next();

  if (!authed) {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (sessionRole(req) !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/verify-otp',
    '/oauth/:path*',
    '/dashboard/:path*',
    '/dashboard',
    '/appointments/:path*',
    '/appointments',
    '/prescriptions/:path*',
    '/prescriptions',
    '/wallet/:path*',
    '/wallet',
    '/rewards/:path*',
    '/rewards',
    '/inbox/:path*',
    '/inbox',
    '/notifications/:path*',
    '/notifications',
    '/patients/:path*',
    '/providers/:path*',
    '/referrals/:path*',
    '/referrals',
    '/telemedicine/:path*',
    '/onboarding/:path*',
    '/pharmacy/:path*',
    '/subscription/:path*',
    '/support/:path*',
    '/support',
    '/settings/:path*',
    '/settings',
    '/admin/:path*',
    '/admin',
  ],
};
