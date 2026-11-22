import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Only checks that the session cookie exists (middleware runs on the edge). Pages verify it on the server. */
export function middleware(req: NextRequest): NextResponse {
  if (req.cookies.get('bp_session')?.value) return NextResponse.next();
  const url = req.nextUrl.clone();
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/projects/:path*', '/settings/:path*'],
};
