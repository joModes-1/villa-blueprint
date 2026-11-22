import type { LedgerRow } from '../../ledger/table';
import type { TaskPlan } from '../../pipeline/schemas';
import { TaskPlan as TaskPlanSchema } from '../../pipeline/schemas';
import {
  AGENTS_PATH,
  CLAUDE_PATH,
  INDEX_PATH,
  NFR_PATH,
  OPEN_QUESTIONS_PATH,
  SRS_PATH,
  START_HERE_PATH,
  TASK_PLAN_PATH,
  TASKS_INDEX_PATH,
  TRACE_PATH,
} from '../spec';
import { renderAgents, renderClaude, renderStartHere } from './agents';
import {
  renderIndex,
  renderOpenQuestions,
  renderTaskBreakdown,
  renderTasksIndex,
  renderTraceability,
  type QuestionLite,
} from './docs';
import { renderTaskFile } from './tasks';

export * from './agents';
export * from './docs';
export * from './tasks';

export interface RenderContext {
  projectName: string;
  ledger: LedgerRow[];
  questions: QuestionLite[];
  /** Content of every document that is already `done`, by path. */
  docs: Map<string, string>;
}

export function parseTaskPlan(json: string | undefined): TaskPlan {
  if (!json) throw new Error('The task plan is not available yet.');
  return TaskPlanSchema.parse(JSON.parse(json));
}

/** Renders one code-written file (docs/29 "Code-written files"). Throws for an unknown path. */
export function renderCodeFile(path: string, ctx: RenderContext): string {
  const plan = (): TaskPlan => parseTaskPlan(ctx.docs.get(TASK_PLAN_PATH));
  switch (path) {
    case INDEX_PATH:
      return renderIndex(ctx.ledger, ctx.projectName);
    case OPEN_QUESTIONS_PATH:
      return renderOpenQuestions(ctx.ledger, ctx.questions);
    case 'docs/15-task-breakdown.md':
      return renderTaskBreakdown(plan());
    case TRACE_PATH:
      return renderTraceability(ctx.docs.get(SRS_PATH) ?? '', ctx.docs.get(NFR_PATH) ?? '', plan());
    case TASKS_INDEX_PATH:
      return renderTasksIndex(plan());
    case AGENTS_PATH:
      return renderAgents(ctx.ledger, plan(), ctx.projectName);
    case CLAUDE_PATH:
      return renderClaude();
    case START_HERE_PATH:
      return renderStartHere(ctx.ledger, plan(), ctx.projectName);
    default: {
      const m = /^docs\/build\/tasks\/task-(\d{3})-/.exec(path);
      if (m?.[1]) {
        const p = plan();
        const task = p.tasks.find((t) => t.number === Number(m[1]));
        if (task) return renderTaskFile(task, ctx.ledger, p);
      }
      throw new Error(`No renderer for ${path}.`);
    }
  }
}
