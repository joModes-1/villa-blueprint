import { parseTaskPlan, runGates, transition, TASK_PLAN_PATH, type JobPayloads, type LedgerRow } from '@blueprint/core';
import { meteredAi, type WorkerContext } from '../context';

/** docs/30: G01–G11, findings replaced (accepted ones are kept), status `ready` or `blocked`. */
export async function runGatesJob(ctx: WorkerContext, payload: JobPayloads['run-gates']): Promise<void> {
  const started = Date.now();
  const { prisma } = ctx;
  const project = await prisma.project.findFirst({ where: { id: payload.projectId, deletedAt: null } });
  if (!project) return;

  const [docs, decisions, questions] = await Promise.all([
    prisma.document.findMany({ where: { projectId: project.id, status: 'done' } }),
    prisma.decision.findMany({ where: { projectId: project.id } }),
    prisma.question.findMany({ where: { projectId: project.id }, select: { key: true, prompt: true, status: true } }),
  ]);
  const ledger: LedgerRow[] = decisions.map((d) => ({ key: d.key, value: d.value, status: d.status, rationale: d.rationale }));
  const map = new Map(docs.map((d) => [d.path, d.content]));
  const plan = parseTaskPlan(map.get(TASK_PLAN_PATH));
  map.delete(TASK_PLAN_PATH);

  const findings = await runGates({ docs: map, ledger, questions, plan }, meteredAi(ctx, project));

  await prisma.$transaction(async (tx) => {
    const old = await tx.gateFinding.findMany({ where: { projectId: project.id, status: 'accepted' } });
    const accepted = new Map(old.map((f) => [`${f.rule}|${f.documentPath ?? ''}|${f.message}`, f.acceptReason]));
    await tx.gateFinding.deleteMany({ where: { projectId: project.id } });
    if (findings.length > 0) {
      await tx.gateFinding.createMany({
        data: findings.map((f) => {
          const reason = accepted.get(`${f.rule}|${f.documentPath ?? ''}|${f.message}`);
          return {
            projectId: project.id,
            rule: f.rule,
            severity: f.severity,
            documentPath: f.documentPath ?? null,
            message: f.message,
            status: reason !== undefined ? ('accepted' as const) : ('open' as const),
            acceptReason: reason ?? null,
          };
        }),
      });
    }
    const openBlockers = await tx.gateFinding.count({ where: { projectId: project.id, severity: 'blocker', status: 'open' } });
    const current = await tx.project.findUniqueOrThrow({ where: { id: project.id }, select: { status: true } });
    const next = transition(current.status, openBlockers === 0 ? 'gates_pass' : 'gates_blocked');
    await tx.project.update({ where: { id: project.id }, data: { status: next } });
    await tx.pipelineRun.update({ where: { id: payload.runId }, data: { done: 1, status: 'succeeded', finishedAt: new Date() } });
  });
  ctx.logger.info({ queue: 'run-gates', projectId: project.id, runId: payload.runId, findings: findings.length, ms: Date.now() - started }, 'job done');
}
