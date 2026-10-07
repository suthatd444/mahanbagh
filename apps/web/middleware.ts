import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const protectedPaths = ['/dashboard', '/admin', '/employee', '/master-broker', '/broker'];
  const isProtected = protectedPaths.some((p) => req.nextUrl.pathname.startsWith(p));
  if (isProtected) {
    const session = req.cookies.get('sessionId');
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
