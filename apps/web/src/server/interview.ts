import type { Prisma, PrismaClient, Project, Question as QuestionRow } from '@blueprint/db';
import {
  answerDecision,
  answerProblem,
  ValidationError,
  catalogByKey,
  finishInterview,
  InvalidStateError,
  NotFoundError,
  transition,
  type Fact,
  type LedgerRow,
  type Question,
  type ProjectView,
} from '@blueprint/core';
import { toProjectView } from './projects';

type Tx = Prisma.TransactionClient;

export function toQuestionView(q: QuestionRow): Question {
  const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string') : [];
  return {
    id: q.id,
    key: q.key,
    area: catalogByKey(q.key)?.area ?? q.key,
    prompt: q.prompt,
    why: q.why,
    options,
    recommended: q.recommended,
    status: q.status,
    answer: q.answer,
  };
}

export async function listFacts(prisma: PrismaClient, project: Project): Promise<Fact[]> {
  const rows = await prisma.fact.findMany({ where: { projectId: project.id }, orderBy: { createdAt: 'asc' } });
  return rows.map((f) => ({
    id: f.id,
    sourceId: f.sourceId,
    category: f.category,
    statement: f.statement,
    quote: f.quote,
    confidence: f.confidence,
  }));
}

export async function listQuestions(prisma: PrismaClient, project: Project): Promise<Question[]> {
  const rows = await prisma.question.findMany({ where: { projectId: project.id }, orderBy: { createdAt: 'asc' } });
  const order = { open: 0, answered: 1, skipped: 2 } as const;
  return rows.sort((a, b) => order[a.status] - order[b.status]).map(toQuestionView);
}

function assertInterviewing(project: Project): void {
  if (project.status !== 'interviewing') {
    throw new InvalidStateError(`Questions can only be answered while the project is "interviewing" (it is "${project.status}").`);
  }
}

async function ledgerRows(tx: Tx, projectId: string): Promise<LedgerRow[]> {
  const rows = await tx.decision.findMany({ where: { projectId } });
  return rows.map((d) => ({ key: d.key, value: d.value, status: d.status, rationale: d.rationale, version: d.version }));
}

async function saveDecision(tx: Tx, projectId: string, up: ReturnType<typeof answerDecision>): Promise<void> {
  await tx.decision.update({
    where: { projectId_key: { projectId, key: up.key } },
    data: {
      value: up.value,
      status: up.status,
      rationale: up.rationale,
      sourceRefs: up.sourceRefs as Prisma.InputJsonObject,
      version: up.version,
    },
  });
}

/** When no question is open: finishInterview defaults, then `ready_to_generate`. Same transaction. */
async function finishIfDone(tx: Tx, project: Project): Promise<Project> {
  const open = await tx.question.count({ where: { projectId: project.id, status: 'open' } });
  if (open > 0) return project;
  for (const up of finishInterview(project.mode, await ledgerRows(tx, project.id))) {
    await saveDecision(tx, project.id, up);
  }
  return tx.project.update({ where: { id: project.id }, data: { status: transition(project.status, 'interview_complete') } });
}

async function findOpen(tx: Tx, project: Project, qid: string): Promise<QuestionRow> {
  const q = await tx.question.findFirst({ where: { id: qid, projectId: project.id } });
  if (!q) throw new NotFoundError('Question not found.');
  return q;
}

export async function answerQuestion(
  prisma: PrismaClient,
  project: Project,
  qid: string,
  answer: string,
): Promise<{ question: Question; decision: { key: string; value: string; status: string }; project: ProjectView }> {
  assertInterviewing(project);
  const problem = answerProblem(answer);
  if (problem) throw new ValidationError(problem);
  return prisma.$transaction(async (tx) => {
    const q = await findOpen(tx, project, qid);
    const row = (await ledgerRows(tx, project.id)).find((r) => r.key === q.key) ?? { key: q.key, value: '', status: 'deferred' as const };
    const up = answerDecision(row, answer, q.id, 'Answered by the user');
    await saveDecision(tx, project.id, up);
    const updated = await tx.question.update({ where: { id: q.id }, data: { status: 'answered', answer: up.value, answeredAt: new Date() } });
    const next = await finishIfDone(tx, project);
    return { question: toQuestionView(updated), decision: { key: up.key, value: up.value, status: up.status }, project: toProjectView(next) };
  });
}

export async function skipQuestion(
  prisma: PrismaClient,
  project: Project,
  qid: string,
): Promise<{ question: Question; project: ProjectView }> {
  assertInterviewing(project);
  return prisma.$transaction(async (tx) => {
    const q = await findOpen(tx, project, qid);
    const updated = await tx.question.update({ where: { id: q.id }, data: { status: 'skipped', answeredAt: new Date() } });
    const next = await finishIfDone(tx, project);
    return { question: toQuestionView(updated), project: toProjectView(next) };
  });
}

export async function acceptRecommended(
  prisma: PrismaClient,
  project: Project,
): Promise<{ answered: number; project: ProjectView }> {
  assertInterviewing(project);
  return prisma.$transaction(async (tx) => {
    const open = await tx.question.findMany({ where: { projectId: project.id, status: 'open' } });
    const ledger = await ledgerRows(tx, project.id);
    let answered = 0;
    for (const q of open) {
      if (!q.recommended) continue;
      const row = ledger.find((r) => r.key === q.key) ?? { key: q.key, value: '', status: 'deferred' as const };
      const up = answerDecision(row, q.recommended, q.id, 'Accepted recommended answer');
      await saveDecision(tx, project.id, up);
      await tx.question.update({ where: { id: q.id }, data: { status: 'answered', answer: up.value, answeredAt: new Date() } });
      answered += 1;
    }
    const next = await finishIfDone(tx, project);
    return { answered, project: toProjectView(next) };
  });
}
