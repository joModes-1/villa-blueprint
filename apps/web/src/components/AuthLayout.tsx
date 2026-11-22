import type { ReactNode } from 'react';

/** Split layout: gradient art and tagline on the left, the form card on the right. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section aria-hidden="false" className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-pink to-amber lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-16 bottom-10 h-64 w-64 rounded-full bg-white/20 blur-3xl" aria-hidden="true" />
        <p className="relative flex items-center gap-2 font-display text-xl font-extrabold text-white">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary">B</span> Villa Blueprint
        </p>
        <p className="relative max-w-md font-display text-5xl font-extrabold leading-tight text-white">From idea to build-ready in one afternoon.</p>
        <p className="relative max-w-sm text-white">Paste your idea. Answer a few questions. Hand the pack to any AI coding agent.</p>
      </section>
      <main id="main" className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-card border border-border bg-white p-8 shadow-card">
          <h1 className="mb-6 text-3xl">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
