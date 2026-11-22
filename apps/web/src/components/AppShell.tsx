import type { ReactNode } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@blueprint/db';
import { getSessionUser } from '@/server/auth';
import { LogoutButton } from './LogoutButton';

/** Top bar plus the page frame. Verifies the session on the server (the middleware only checks the cookie). */
export async function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const jar = await cookies();
  const cookie = jar.get('bp_session');
  const user = cookie ? await getSessionUser(prisma, new Request('http://internal/', { headers: { cookie: `bp_session=${cookie.value}` } })) : null;
  if (!user) redirect('/login');
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="blob -left-24 -top-24 h-80 w-80 bg-primary/20" aria-hidden="true" />
      <div className="blob right-0 top-40 h-72 w-72 bg-pink/15" aria-hidden="true" />
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/projects" className="flex items-center gap-2 font-display text-lg font-extrabold">
            <span className="brand-gradient inline-flex h-8 w-8 items-center justify-center rounded-lg text-white" aria-hidden="true">
              B
            </span>
            Villa Blueprint
          </Link>
          <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm font-medium">
            <Link href="/projects" className="rounded-lg px-3 py-2 hover:bg-primary-soft">
              Projects
            </Link>
            <Link href="/settings" className="rounded-lg px-3 py-2 hover:bg-primary-soft">
              Settings
            </Link>
            <span className="hidden px-2 text-muted sm:inline" data-testid="user-name">
              {user.name}
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main id="main" className={`mx-auto px-4 py-8 sm:px-6 ${wide ? 'max-w-[1100px]' : 'max-w-[1100px]'}`}>
        {children}
      </main>
    </div>
  );
}
