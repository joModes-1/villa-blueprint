import {
  analyzePrompt,
  AnalyzeResponse,
  applyAnalysis,
  completeJson,
  transition,
  type JobPayloads,
  type LedgerRow,
} from '@blueprint/core';
import type { Prisma } from '@blueprint/db';
import { meteredAi, type WorkerContext } from '../context';

function toRefs(v: Prisma.JsonValue): LedgerRow['sourceRefs'] {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as LedgerRow['sourceRefs']) : {};
}

/** docs/27 stage `analyze`: one reasoning call fills the ledger and writes the interview questions. */
export async function analyzeProject(ctx: WorkerContext, payload: JobPayloads['analyze-project']): Promise<void> {
  const started = Date.now();
  const { prisma } = ctx;
  const project = await prisma.project.findFirst({ where: { id: payload.projectId, deletedAt: null } });
  if (!project) return;

  const [facts, decisions, questions] = await Promise.all([
    prisma.fact.findMany({ where: { projectId: project.id }, orderBy: { createdAt: 'asc' } }),
    prisma.decision.findMany({ where: { projectId: project.id } }),
    prisma.question.findMany({ where: { projectId: project.id } }),
  ]);

  const prompt = analyzePrompt(
    project.mode,
    facts.map((f) => ({ id: f.id, category: f.category, statement: f.statement, confidence: f.confidence, sourceId: f.sourceId })),
  );
  const { data } = await completeJson(
    meteredAi(ctx, project),
    { tag: 'analyze', model: 'reasoning', system: prompt.system, user: prompt.user, json: true, temperature: 0.2 },
    AnalyzeResponse,
  );

  const ledger: LedgerRow[] = decisions.map((d) => ({
    key: d.key,
    value: d.value,
    status: d.status,
    rationale: d.rationale,
    sourceRefs: toRefs(d.sourceRefs),
    version: d.version,
  }));
  const outcome = applyAnalysis({
    mode: project.mode,
    ledger,
    factIds: new Set(facts.map((f) => f.id)),
    questions: questions.map((q) => ({ id: q.id, key: q.key, status: q.status })),
    analysis: data,
  });

  await prisma.$transaction(async (tx) => {
    for (const up of outcome.decisionUpserts) {
      await tx.decision.update({
        where: { projectId_key: { projectId: project.id, key: up.key } },
        data: {
          value: up.value,
          status: up.status,
          rationale: up.rationale,
          sourceRefs: up.sourceRefs as Prisma.InputJsonObject,
          version: up.version,
        },
      });
    }
    if (outcome.questionDeleteIds.length > 0) {
      await tx.question.deleteMany({ where: { projectId: project.id, id: { in: outcome.questionDeleteIds } } });
    }
    if (outcome.questionCreates.length > 0) {
      await tx.question.createMany({
        data: outcome.questionCreates.map((q) => ({
          projectId: project.id,
          key: q.key,
          prompt: q.prompt,
          why: q.why,
          options: q.options,
          recommended: q.recommended,
        })),
      });
    }
    const event = outcome.nextStatus === 'interviewing' ? 'analysis_questions_open' : 'analysis_no_questions';
    await tx.project.update({ where: { id: project.id }, data: { status: transition(project.status, event) } });
    await tx.pipelineRun.update({
      where: { id: payload.runId },
      data: { done: 1, status: 'succeeded', finishedAt: new Date() },
    });
  });

  ctx.logger.info(
    { queue: 'analyze-project', projectId: project.id, runId: payload.runId, ms: Date.now() - started, outcome: outcome.nextStatus },
    'job done',
  );
}
