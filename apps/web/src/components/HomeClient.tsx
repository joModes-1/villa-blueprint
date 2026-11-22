'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import type { ProjectSummary } from '@blueprint/core/src/api-types';
import { api, errorMessage } from '@/lib/api-client';
import { STATUS_LABEL, STATUS_TONE, timeAgo } from '@/lib/labels';
import { PromptBox } from './PromptBox';
import { Badge, Card, EmptyState, ErrorBanner, LoadingList } from './ui/display';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { useToast } from './ui/Toast';

export function HomeClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems((await api<{ items: ProjectSummary[] }>('/projects')).items);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/projects/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      toast('Project deleted.', 'success');
      await load();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section className="relative flex flex-col items-center gap-6 pt-4 text-center">
        <div className="blob left-1/4 top-0 h-64 w-64 bg-amber/20" aria-hidden="true" />
        <h1 className="text-gradient font-display text-4xl font-extrabold leading-tight sm:text-[56px] sm:leading-[64px]">What do you want to build?</h1>
        <p className="max-w-xl text-muted">Paste your idea, a whole chat, files or a Figma link. Blueprint asks the few questions that matter, then writes the pack your AI coding agent builds from.</p>
        <PromptBox onStarted={(id) => router.push(`/projects/${id}`)} />
      </section>

      <section aria-labelledby="recent">
        <h2 id="recent" className="mb-4 text-2xl">
          Recent projects
        </h2>
        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
        {!error && items === null ? <LoadingList /> : null}
        {items && items.length === 0 ? (
          <EmptyState
            title="Turn your first idea into a build-ready pack"
            text="Paste → Answer → Build. Start with the box above."
            icon={
              <ol className="flex flex-wrap justify-center gap-3 text-sm font-semibold">
                {['Paste', 'Answer', 'Build'].map((s, i) => (
                  <li key={s} className="flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1">
                    <span className="brand-gradient inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-white">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            }
          />
        ) : null}
        {items && items.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Card as="li" key={p.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projects/${p.id}`} className="font-display text-lg font-bold hover:text-primary">
                    {p.name}
                  </Link>
                  <button type="button" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger-ink">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  <Badge tone="neutral" className="capitalize">
                    {p.mode}
                  </Badge>
                  {p.counts.openBlockers > 0 ? <Badge tone="danger">{p.counts.openBlockers} blockers</Badge> : null}
                </div>
                <p className="text-[13px] text-muted">Updated {timeAgo(p.updatedAt)}</p>
              </Card>
            ))}
          </ul>
        ) : null}
      </section>

      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title="Delete this project?">
        <p className="mb-5 text-muted">“{deleting?.name}” and everything in it will be removed from your list.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void confirmDelete()}>
            Delete project
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
