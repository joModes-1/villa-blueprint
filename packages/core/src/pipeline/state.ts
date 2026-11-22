import { InvalidStateError } from '../errors';

export type ProjectStatus =
  | 'draft'
  | 'processing'
  | 'interviewing'
  | 'ready_to_generate'
  | 'generating'
  | 'gating'
  | 'ready'
  | 'blocked'
  | 'stale'
  | 'failed';

export type RunStage = 'process' | 'analyze' | 'generate' | 'gate';

export type ProjectEvent =
  | 'analyze'
  | 'analysis_questions_open'
  | 'analysis_no_questions'
  | 'interview_complete'
  | 'generate'
  | 'docs_done'
  | 'gates_pass'
  | 'gates_blocked'
  | 'blockers_accepted'
  | 'ledger_edit_stale'
  | 'run_failed'
  | 'retry';

export class InvalidTransitionError extends InvalidStateError {
  constructor(from: ProjectStatus, event: ProjectEvent) {
    super(`This action is not allowed while the project is "${from}" (event: ${event}).`);
  }
}

export interface TransitionContext {
  /** Required guard for `analyze`: the project needs at least one source. */
  sourceCount?: number;
  /** Required for `retry`: the stage of the failed run. */
  failedStage?: RunStage;
}

const TABLE: Record<ProjectEvent, Partial<Record<ProjectStatus, ProjectStatus>>> = {
  analyze: { draft: 'processing', interviewing: 'processing', ready_to_generate: 'processing', failed: 'processing' },
  analysis_questions_open: { processing: 'interviewing' },
  analysis_no_questions: { processing: 'ready_to_generate' },
  interview_complete: { interviewing: 'ready_to_generate' },
  generate: { ready_to_generate: 'generating', stale: 'generating', ready: 'generating', blocked: 'generating' },
  docs_done: { generating: 'gating' },
  gates_pass: { gating: 'ready' },
  gates_blocked: { gating: 'blocked' },
  blockers_accepted: { blocked: 'ready' },
  ledger_edit_stale: { ready: 'stale', blocked: 'stale' },
  run_failed: { processing: 'failed', generating: 'failed', gating: 'failed' },
  retry: { failed: 'processing' }, // overridden by the failed stage below
};

const RETRY_TARGET: Record<RunStage, ProjectStatus> = {
  process: 'processing',
  analyze: 'processing',
  generate: 'generating',
  gate: 'gating',
};

/** The single place where project status changes are decided. Throws InvalidTransitionError. */
export function transition(
  status: ProjectStatus,
  event: ProjectEvent,
  ctx: TransitionContext = {},
): ProjectStatus {
  if (event === 'analyze' && ctx.sourceCount !== undefined && ctx.sourceCount < 1) {
    throw new InvalidStateError('Add at least one source before analyzing.');
  }
  if (event === 'retry') {
    if (status !== 'failed') throw new InvalidTransitionError(status, event);
    return RETRY_TARGET[ctx.failedStage ?? 'process'];
  }
  const next = TABLE[event][status];
  if (!next) throw new InvalidTransitionError(status, event);
  return next;
}

/** Statuses in which sources may be added or deleted. */
export const SOURCE_EDIT_STATUSES: ProjectStatus[] = ['draft', 'interviewing', 'ready_to_generate', 'failed'];
/** Statuses in which decisions may be edited. */
export const DECISION_EDIT_STATUSES: ProjectStatus[] = [
  'interviewing',
  'ready_to_generate',
  'ready',
  'blocked',
  'stale',
  'failed',
];
/** Statuses in which a background run is active. */
export const RUNNING_STATUSES: ProjectStatus[] = ['processing', 'generating', 'gating'];
