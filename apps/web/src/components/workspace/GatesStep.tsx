'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import type { GateFinding, ProjectView, Usage } from '@blueprint/core/src/api-types';
import { api, errorMessage } from '@/lib/api-client';
import { useResource } from '@/lib/use-resource';
import { Badge, Banner, Card, EmptyState, ErrorBanner, LoadingList } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/fields';
import { useToast } from '@/components/ui/Toast';

/** The reason the export is unavailable, or null when it is allowed. */
export function exportBlockReason(status: ProjectView['status'], findings: GateFinding[]): string | null {
  const open = findings.filter((f) => f.severity === 'blocker' && f.status === 'open').length;
  if (status === 'ready') return null;
  if (status === 'blocked') return open === 0 ? null : `${open} ${open === 1 ? 'issue' : 'issues'} must be fixed or accepted first.`;
  return 'The checks have not finished yet.';
}

export function GatesStep({
  projectId,
  project,
  onChanged,
  onOpenDoc,
}: {
  projectId: string;
  project: ProjectView;
  onChanged: () => Promise<void>;
  onOpenDoc: (path: string) => void;
}) {
  const findings = useResource<{ items: GateFinding[] }>(`/projects/${projectId}/findings`);
  const usage = useResource<Usage>(`/projects/${projectId}/usage`);
  const [accepting, setAccepting] = useState<GateFinding | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  if (findings.error) return <ErrorBanner message={findings.error} onRetry={() => void findings.reload()} />;
  if (findings.loading && !findings.data) return <LoadingList />;
  const items = findings.data?.items ?? [];
  const blockers = items.filter((f) => f.severity === 'blocker' && f.status === 'open').length;
  const block = exportBlockReason(project.status, items);

  async function accept(): Promise<void> {
    if (!accepting) return;
    setBusy(true);
    try {
      await api(`/projects/${projectId}/findings/${accepting.id}/accept`, { method: 'POST', body: { reason } });
      setAccepting(null);
      setReason('');
      toast('Accepted.', 'success');
      await findings.reload();
      await onChanged();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <h2 className="text-2xl">{block === null && blockers === 0 ? <span className="text-gradient">Your blueprint is ready</span> : 'Quality checks'}</h2>
        {items.length === 0 ? (
          <Banner tone="success">All 11 quality checks passed ✓</Banner>
        ) : blockers > 0 ? (
          <Banner tone="danger">
            {blockers} {blockers === 1 ? 'issue needs' : 'issues need'} your attention
          </Banner>
        ) : (
          <Banner tone="success">No blockers. {items.length} notes below.</Banner>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {block === null ? (
            <a href={`/api/v1/projects/${projectId}/export`} className="btn-gradient inline-flex min-h-[44px] items-center gap-2 rounded-control px-4 py-2 font-semibold shadow-card">
              <Download className="h-4 w-4" aria-hidden="true" /> Download pack (.zip)
            </a>
          ) : (
            <Button disabled icon={<Download className="h-4 w-4" aria-hidden="true" />}>
              Download pack (.zip)
            </Button>
          )}
          {block ? <p className="text-sm text-muted">{block}</p> : null}
        </div>
      </Card>

      <section aria-labelledby="findings-h">
        <h3 id="findings-h" className="mb-3 text-xl">
          Findings
        </h3>
        {items.length === 0 ? <EmptyState title="Nothing to fix" text="Every check passed." /> : null}
        <ul className="flex flex-col gap-3">
          {items.map((f) => (
            <Card as="li" key={f.id} className="flex flex-wrap items-start gap-3 !p-4">
              <Badge tone={f.severity === 'blocker' ? 'danger' : 'warning'}>{f.severity}</Badge>
              <Badge tone="neutral">{f.rule}</Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{f.message}</p>
                {f.documentPath ? (
                  <button type="button" className="font-mono text-[13px] text-sky-ink underline" onClick={() => onOpenDoc(f.documentPath as string)}>
                    {f.documentPath}
                  </button>
                ) : null}
                {f.status === 'accepted' ? <p className="text-[13px] text-muted">Accepted: {f.acceptReason}</p> : null}
              </div>
              {f.status === 'open' && f.severity === 'blocker' ? (
                <Button variant="secondary" onClick={() => setAccepting(f)}>
                  Accept with reason
                </Button>
              ) : f.status === 'accepted' ? (
                <Badge tone="success">Accepted</Badge>
              ) : null}
            </Card>
          ))}
        </ul>
      </section>

      <Card as="section">
        <h3 className="mb-2 text-lg">Usage</h3>
        {usage.data ? (
          <p>
            Used {(usage.data.tokensIn + usage.data.tokensOut).toLocaleString()} tokens · ${usage.data.costUsd.toFixed(2)}
          </p>
        ) : usage.error ? (
          <p className="text-danger-ink">{usage.error}</p>
        ) : (
          <LoadingList rows={1} />
        )}
      </Card>

      <Dialog open={accepting !== null} onClose={() => setAccepting(null)} title="Accept this issue">
        <p className="mb-3 text-sm text-muted">{accepting?.message}</p>
        <Textarea label="Reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} hint="3 to 500 characters. It is saved with the finding." />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setAccepting(null)}>
            Cancel
          </Button>
          <Button loading={busy} disabled={reason.trim().length < 3} onClick={() => void accept()}>
            Accept
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
