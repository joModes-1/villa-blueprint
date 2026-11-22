'use client';

import { useState } from 'react';
import type { ProjectView, Run } from '@blueprint/core/src/api-types';
import { api, errorMessage } from '@/lib/api-client';
import { Banner, ProgressBar } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { runLabel, type StepId } from './steps';

export function RunBanner({
  projectId,
  project,
  run,
  staleCount,
  blockerCount,
  onChanged,
  onGoto,
}: {
  projectId: string;
  project: ProjectView;
  run: Run | null;
  staleCount: number;
  blockerCount: number;
  onChanged: () => Promise<void>;
  onGoto: (s: StepId) => void;
}) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function post(path: string): Promise<void> {
    setBusy(true);
    try {
      await api(`/projects/${projectId}/${path}`, { method: 'POST' });
      await onChanged();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setBusy(false);
    }
  }

  if (run && (run.status === 'running' || run.status === 'queued') && ['processing', 'generating', 'gating'].includes(project.status)) {
    return (
      <Banner tone="info" sticky>
        <div className="flex flex-col gap-2">
          <span>{runLabel(run)}</span>
          <ProgressBar value={run.done} max={Math.max(run.total, 1)} label={runLabel(run)} />
        </div>
      </Banner>
    );
  }
  if (project.status === 'failed') {
    return (
      <Banner
        tone="danger"
        action={
          <Button variant="secondary" loading={busy} onClick={() => void post('retry')}>
            Retry
          </Button>
        }
      >
        Something stopped the last run{run?.error ? `: ${run.error}` : '.'}
      </Banner>
    );
  }
  if (project.status === 'stale') {
    return (
      <Banner
        tone="warning"
        action={
          <Button loading={busy} onClick={() => void post('generate')}>
            Regenerate
          </Button>
        }
      >
        {staleCount} {staleCount === 1 ? 'document is' : 'documents are'} out of date with your ledger.
      </Banner>
    );
  }
  if (project.status === 'blocked') {
    return (
      <Banner tone="warning" action={<Button variant="secondary" onClick={() => onGoto('gates')}>Review issues</Button>}>
        {blockerCount} {blockerCount === 1 ? 'issue must' : 'issues must'} be fixed or accepted before export.
      </Banner>
    );
  }
  return null;
}
