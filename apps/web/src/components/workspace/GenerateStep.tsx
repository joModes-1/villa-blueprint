'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { DecisionView, DocumentListItem, ProjectView, Run } from '@blueprint/core/src/api-types';
import { api, errorMessage } from '@/lib/api-client';
import { useResource } from '@/lib/use-resource';
import { Card, ErrorBanner, LoadingList, ProgressBar } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { runLabel } from './steps';

function StatusIcon({ status }: { status: DocumentListItem['status'] }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-success-ink" aria-label="Done" />;
  if (status === 'generating') return <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Writing" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-danger" aria-label="Failed" />;
  if (status === 'stale') return <Circle className="h-4 w-4 text-amber" aria-label="Out of date" />;
  return <Circle className="h-4 w-4 text-muted" aria-label="Waiting" />;
}

export function GenerateStep({
  projectId,
  project,
  run,
  running,
  onChanged,
  onGotoLedger,
}: {
  projectId: string;
  project: ProjectView;
  run: Run | null;
  running: boolean;
  onChanged: () => Promise<void>;
  onGotoLedger: (key: string) => void;
}) {
  const estimate = useResource<{ aiCalls: number; tokens: number }>(`/projects/${projectId}/estimate`);
  const decisions = useResource<{ items: DecisionView[] }>(`/projects/${projectId}/decisions`);
  const docs = useResource<{ items: DocumentListItem[] }>(`/projects/${projectId}/documents`, running);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const missing = (decisions.data?.items ?? []).filter((d) => d.priority === 'P0' && d.value.trim() === '');
  const items = docs.data?.items ?? [];
  const stale = items.filter((d) => d.status === 'stale' || d.status === 'failed').length;
  const regenerate = project.status === 'stale' || project.status === 'ready' || project.status === 'blocked';
  const canGenerate = ['ready_to_generate', 'stale', 'ready', 'blocked'].includes(project.status) && missing.length === 0 && !running;

  async function generate(): Promise<void> {
    setBusy(true);
    try {
      await api(`/projects/${projectId}/generate`, { method: 'POST' });
      await onChanged();
      await docs.reload();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setBusy(false);
    }
  }

  const done = items.filter((d) => d.status === 'done').length;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        {estimate.error ? <ErrorBanner message={estimate.error} onRetry={() => void estimate.reload()} /> : null}
        {estimate.loading && !estimate.data ? <LoadingList rows={1} /> : null}
        {estimate.data ? (
          <p className="text-lg font-semibold">
            ≈ {estimate.data.aiCalls} AI calls, ≈ {estimate.data.tokens.toLocaleString()} tokens
          </p>
        ) : null}
        {missing.length > 0 ? (
          <div role="alert" className="rounded-control border border-danger/40 bg-danger-soft p-3 text-danger-ink">
            <p className="font-semibold">These required decisions are still empty:</p>
            <ul className="mt-1 list-disc pl-5">
              {missing.map((m) => (
                <li key={m.key}>
                  <button type="button" onClick={() => onGotoLedger(m.key)} className="underline">
                    {m.area}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {running && run ? (
          <div className="flex flex-col gap-2">
            <p className="font-semibold">{runLabel(run)}</p>
            <ProgressBar value={run.done} max={Math.max(run.total, 1)} label="Generation progress" />
          </div>
        ) : null}
        <div>
          <Button loading={busy} disabled={!canGenerate} onClick={() => void generate()}>
            {regenerate && stale > 0 ? `Regenerate ${stale} stale` : regenerate ? 'Regenerate' : 'Generate pack'}
          </Button>
        </div>
      </Card>

      <section aria-labelledby="doc-progress">
        <h2 id="doc-progress" className="mb-3 text-xl">
          Documents {items.length > 0 ? `(${done} of ${items.length} written)` : ''}
        </h2>
        {docs.error ? <ErrorBanner message={docs.error} onRetry={() => void docs.reload()} /> : null}
        {docs.loading && !docs.data ? <LoadingList rows={3} /> : null}
        {docs.data && items.length === 0 ? <p className="text-muted">Nothing is written yet. Press Generate to start.</p> : null}
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((d) => (
            <li key={d.path} className="slide-in flex items-center gap-2 rounded-control border border-border bg-white px-3 py-2 text-sm">
              <StatusIcon status={d.status} />
              <span className="truncate font-mono text-[13px]">{d.path}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
