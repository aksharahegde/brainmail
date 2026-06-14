import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get('brainmail_session');

  if (pathname.startsWith('/api/v1')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/workspaces', request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
