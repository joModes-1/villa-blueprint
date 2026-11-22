import type { ProjectCounts, ProjectView, Run } from '@blueprint/core/src/api-types';

export type StepId = 'sources' | 'facts' | 'interview' | 'ledger' | 'generate' | 'documents' | 'gates';

export interface StepDef {
  id: StepId;
  label: string;
}

export const STEPS: StepDef[] = [
  { id: 'sources', label: 'Sources' },
  { id: 'facts', label: 'Facts' },
  { id: 'interview', label: 'Interview' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'generate', label: 'Generate' },
  { id: 'documents', label: 'Documents' },
  { id: 'gates', label: 'Gates and export' },
];

type Status = ProjectView['status'];

const ORDER: Status[] = ['draft', 'processing', 'interviewing', 'ready_to_generate', 'generating', 'gating', 'ready', 'blocked', 'stale', 'failed'];
const rank = (s: Status): number => ORDER.indexOf(s);

export const RUNNING: Status[] = ['processing', 'generating', 'gating'];
export const SOURCE_EDITABLE: Status[] = ['draft', 'interviewing', 'ready_to_generate', 'failed'];

/** docs/11 "Workspace stepper": which steps are enabled. */
export function stepEnabled(step: StepId, project: ProjectView, counts: ProjectCounts): boolean {
  const s = project.status;
  const failedWithLedger = s === 'failed' && counts.facts > 0;
  switch (step) {
    case 'sources':
      return true;
    case 'facts':
      return counts.facts > 0;
    case 'interview':
    case 'ledger':
      return (rank(s) >= rank('interviewing') && s !== 'failed') || failedWithLedger;
    case 'generate':
      return (rank(s) >= rank('ready_to_generate') && s !== 'failed') || counts.documents > 0;
    case 'documents':
      return counts.documents > 0;
    case 'gates':
      return s === 'ready' || s === 'blocked';
  }
}

/** The current step comes from the project status (docs/11). */
export function currentStep(project: ProjectView, latestRun: Run | null): StepId {
  switch (project.status) {
    case 'draft':
    case 'processing':
      return 'sources';
    case 'interviewing':
      return 'interview';
    case 'ready_to_generate':
    case 'generating':
    case 'gating':
    case 'stale':
      return 'generate';
    case 'ready':
    case 'blocked':
      return 'gates';
    case 'failed':
      return latestRun && (latestRun.stage === 'generate' || latestRun.stage === 'gate') ? 'generate' : 'sources';
  }
}

export function runLabel(run: Run): string {
  const word = { process: 'Reading your sources', analyze: 'Analyzing your sources', generate: 'Generating documents', gate: 'Running quality checks' }[run.stage];
  return `${word}… ${run.done}/${run.total}`;
}
