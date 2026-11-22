'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import type { DocumentListItem, ProjectCounts, ProjectView, Run } from '@blueprint/core/src/api-types';
import { api, ApiError, errorMessage } from '@/lib/api-client';
import { usePoll } from '@/lib/use-poll';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/labels';
import { Badge, ErrorBanner, LoadingList } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Stepper } from './Stepper';
import { RunBanner } from './RunBanner';
import { SourcesStep } from './SourcesStep';
import { FactsStep } from './FactsStep';
import { InterviewStep } from './InterviewStep';
import { LedgerStep } from './LedgerStep';
import { GenerateStep } from './GenerateStep';
import { DocumentsStep } from './DocumentsStep';
import { GatesStep } from './GatesStep';
import { currentStep, RUNNING, SOURCE_EDITABLE, stepEnabled, type StepId } from './steps';

interface ProjectResponse {
  project: ProjectView;
  counts: ProjectCounts;
  latestRun: Run | null;
}

export function Workspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<ProjectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<StepId | null>(null);
  const [docPath, setDocPath] = useState<string | undefined>();
  const [focusKey, setFocusKey] = useState<string | undefined>();
  const [staleCount, setStaleCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const lastStatus = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<ProjectResponse>(`/projects/${projectId}`);
      setData(res);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        router.replace('/projects');
        return;
      }
      setError(errorMessage(err));
    }
  }, [projectId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = data?.project.status;
  const running = !!status && RUNNING.includes(status);
  usePoll(load, running);

  // Follow the project status: when it changes, jump to the step that fits it (docs/11).
  useEffect(() => {
    if (!data) return;
    if (lastStatus.current !== data.project.status) {
      lastStatus.current = data.project.status;
      setStep(currentStep(data.project, data.latestRun));
    }
  }, [data]);

  useEffect(() => {
    if (status !== 'stale') return;
    void api<{ items: DocumentListItem[] }>(`/projects/${projectId}/documents`).then((r) => setStaleCount(r.items.filter((d) => d.status === 'stale').length)).catch(() => undefined);
  }, [status, projectId]);

  if (error && !data) return <ErrorBanner message={error} onRetry={() => void load()} />;
  if (!data || !step) return <LoadingList rows={4} />;

  const { project, counts, latestRun } = data;
  const enabled = (s: StepId): boolean => stepEnabled(s, project, counts);

  async function rename(): Promise<void> {
    const next = name.trim();
    setEditing(false);
    if (!next || next === project.name) return;
    try {
      await api(`/projects/${projectId}`, { method: 'PATCH', body: { name: next } });
      await load();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    }
  }

  async function toggleMode(): Promise<void> {
    try {
      await api(`/projects/${projectId}`, { method: 'PATCH', body: { mode: project.mode === 'founder' ? 'expert' : 'founder' } });
      await load();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    }
  }

  const modeSwitchable = project.status === 'draft' || project.status === 'interviewing';

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void rename();
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="project-name" className="sr-only">
              Project name
            </label>
            <input id="project-name" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="rounded-control border border-primary/40 px-3 py-2 font-display text-2xl font-bold" />
            <Button type="submit">Save</Button>
          </form>
        ) : (
          <h1 className="text-3xl">
            {project.name}
            <button type="button" aria-label="Rename project" onClick={() => { setName(project.name); setEditing(true); }} className="ml-2 inline-flex rounded-lg p-1 align-middle text-muted hover:bg-primary-soft">
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </h1>
        )}
        {modeSwitchable ? (
          <button type="button" onClick={() => void toggleMode()} title="Switch mode" className="rounded-full">
            <Badge tone="neutral" className="capitalize">
              {project.mode} · switch
            </Badge>
          </button>
        ) : (
          <Badge tone="neutral" className="capitalize">
            {project.mode}
          </Badge>
        )}
        <Badge tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
      </header>

      <Stepper active={step} enabled={enabled} onSelect={setStep} />
      <RunBanner
        projectId={projectId}
        project={project}
        run={latestRun}
        staleCount={staleCount}
        blockerCount={counts.openBlockers}
        onChanged={load}
        onGoto={setStep}
      />

      <div className="mt-1">
        {step === 'sources' ? (
          <SourcesStep
            projectId={projectId}
            editable={SOURCE_EDITABLE.includes(project.status)}
            locked={running}
            onChanged={load}
          />
        ) : null}
        {step === 'sources' && SOURCE_EDITABLE.includes(project.status) ? (
          <div className="mt-6">
            <AnalyzeButton projectId={projectId} disabled={counts.sources === 0 || running} onStarted={load} />
          </div>
        ) : null}
        {step === 'facts' ? <FactsStep projectId={projectId} onNext={() => setStep(enabled('interview') ? 'interview' : 'sources')} /> : null}
        {step === 'interview' ? <InterviewStep projectId={projectId} locked={running || project.status !== 'interviewing'} onChanged={load} /> : null}
        {step === 'ledger' ? <LedgerStep projectId={projectId} locked={running} onChanged={load} focusKey={focusKey} /> : null}
        {step === 'generate' ? (
          <GenerateStep
            projectId={projectId}
            project={project}
            run={latestRun}
            running={running}
            onChanged={load}
            onGotoLedger={(key) => {
              setFocusKey(key);
              setStep('ledger');
            }}
          />
        ) : null}
        {step === 'documents' ? <DocumentsStep projectId={projectId} initialPath={docPath} running={running} /> : null}
        {step === 'gates' ? (
          <GatesStep
            projectId={projectId}
            project={project}
            onChanged={load}
            onOpenDoc={(p) => {
              setDocPath(p);
              setStep('documents');
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function AnalyzeButton({ projectId, disabled, onStarted }: { projectId: string; disabled: boolean; onStarted: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  return (
    <Button
      loading={busy}
      disabled={disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/projects/${projectId}/analyze`, { method: 'POST' });
          await onStarted();
        } catch (err) {
          toast(errorMessage(err), 'danger');
        } finally {
          setBusy(false);
        }
      }}
    >
      Analyze
    </Button>
  );
}
