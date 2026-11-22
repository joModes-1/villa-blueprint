import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-gradient font-display text-6xl font-extrabold">404</p>
      <h1 className="text-2xl">We couldn’t find that page</h1>
      <p className="text-muted">It may have moved, or it belongs to another account.</p>
      <Link href="/projects" className="btn-gradient inline-flex min-h-[44px] items-center rounded-control px-5 py-2 font-semibold">
        Back to your projects
      </Link>
    </main>
  );
}
