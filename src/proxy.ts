import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

export async function proxy(req: NextRequest) {
  const protectedRoutes = ['/dashboard'];
  const path = req.nextUrl.pathname;
  
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  if (isProtectedRoute) {
    const cookie = req.cookies.get('session')?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const role = (session.role as string)?.toUpperCase();
    
    // Role-based authorization
    if (path.startsWith('/dashboard/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (path.startsWith('/dashboard/staff') && role !== 'STAFF' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (path.startsWith('/dashboard/doctor') && role !== 'DOCTOR') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (path.startsWith('/dashboard/patient') && role !== 'PATIENT') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
