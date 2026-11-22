import {
  buildDocPrompt,
  completeJson,
  computeHashes,
  extractRequirements,
  NFR_PATH,
  specWithTaskFiles,
  SRS_PATH,
  TASK_PLAN_PATH,
  taskFilePath,
  taskPlanPrompt,
  TaskPlan,
  validateDoc,
  validateTaskPlan,
  type JobPayloads,
  type LedgerRow,
  type PackFileSpec,
} from '@blueprint/core';
import type { Prisma } from '@blueprint/db';
import { meteredAi, type WorkerContext } from '../context';
import { incrementRun } from '../runs';

async function loadInputs(ctx: WorkerContext, documentId: string) {
  const { prisma } = ctx;
  const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { project: true } });
  if (!doc || doc.project.deletedAt || doc.status !== 'generating') return null;
  const project = doc.project;
  const [docs, decisions] = await Promise.all([
    prisma.document.findMany({ where: { projectId: project.id } }),
    prisma.decision.findMany({ where: { projectId: project.id } }),
  ]);
  const ledger: LedgerRow[] = decisions.map((d) => ({ key: d.key, value: d.value, status: d.status, rationale: d.rationale }));
  const spec = specWithTaskFiles(docs.map((d) => d.path)).find((s) => s.path === doc.path);
  if (!spec) throw new Error(`No spec for ${doc.path}.`);
  const done = new Map(docs.filter((d) => d.status === 'done').map((d) => [d.path, d.content]));
  const hash = computeHashes(specWithTaskFiles(docs.map((d) => d.path)), ledger).get(doc.path) ?? '';
  return { doc, project, ledger, spec, done, hash, docs };
}

function contextOf(spec: PackFileSpec, done: Map<string, string>) {
  return spec.context.filter((p) => done.has(p)).map((p) => ({ path: p, content: done.get(p) as string }));
}

async function failDoc(ctx: WorkerContext, documentId: string, error: string, projectId: string, runId: string): Promise<void> {
  await ctx.prisma.document.update({ where: { id: documentId }, data: { status: 'failed', error: error.slice(0, 500) } });
  await ctx.enqueue('schedule-generation', { projectId, runId });
}

/** docs/27 `generate-doc`: one AI call per AI-written file, validated and retried once. */
export async function generateDoc(ctx: WorkerContext, payload: JobPayloads['generate-doc']): Promise<void> {
  const started = Date.now();
  const inputs = await loadInputs(ctx, payload.documentId);
  if (!inputs) return;
  const { doc, project, ledger, spec, done, hash } = inputs;
  const ai = meteredAi(ctx, project);

  if (doc.path === TASK_PLAN_PATH) {
    await generateTaskPlan(ctx, payload, inputs, ai);
    return;
  }

  const figma = doc.path === 'docs/11-ui-ux-specification.md'
    ? (await ctx.prisma.source.findMany({ where: { projectId: project.id, kind: 'figma' }, select: { text: true } }))
        .map((s) => s.text ?? '')
        .join('\n\n')
    : '';

  let missing: string[] = [];
  let tokensIn = 0;
  let tokensOut = 0;
  let content = '';
  let lastContent = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const prompt = buildDocPrompt({
      spec,
      ledger,
      contextDocs: contextOf(spec, done),
      figmaText: figma,
      missingHeadings: attempt > 1 ? missing : undefined,
    });
    const res = await ai.complete({
      tag: `doc:${doc.path}`,
      model: spec.model ?? 'fast',
      system: prompt.system,
      user: prompt.user,
      maxTokens: 16_000,
      temperature: 0.2,
    });
    tokensIn += res.tokensIn;
    tokensOut += res.tokensOut;
    const check = validateDoc(res.text, spec.headings);
    if (check.ok) {
      content = check.content;
      missing = [];
      break;
    }
    missing = check.missing;
    lastContent = check.content;
  }

  // A document that is substantial but still lacks a heading is kept, not discarded: the run continues and
  // gate G01 reports the heading, so the user can accept it or regenerate. Only an unusable answer fails.
  let note: string | null = null;
  if (missing.length > 0) {
    if (lastContent.length < 300) {
      await failDoc(ctx, doc.id, `The model did not return a usable document (missing: ${missing.join('; ')})`, project.id, payload.runId);
      return;
    }
    content = lastContent;
    note = `Saved with missing headings: ${missing.join('; ')}`.slice(0, 500);
  }

  await ctx.prisma.$transaction(async (tx) => {
    const claimed = await tx.document.updateMany({
      where: { id: doc.id, status: 'generating' },
      data: { content, status: 'done', inputsHash: hash, tokensIn, tokensOut, error: note },
    });
    if (claimed.count > 0) await incrementRun(tx, payload.runId);
  });
  ctx.logger.info({ queue: 'generate-doc', projectId: project.id, runId: payload.runId, path: doc.path, ms: Date.now() - started, outcome: 'ok' }, 'job done');
  await ctx.enqueue('schedule-generation', { projectId: project.id, runId: payload.runId });
}

async function generateTaskPlan(
  ctx: WorkerContext,
  payload: JobPayloads['generate-doc'],
  inputs: NonNullable<Awaited<ReturnType<typeof loadInputs>>>,
  ai: ReturnType<typeof meteredAi>,
): Promise<void> {
  const { doc, project, ledger, spec, done, hash } = inputs;
  const requirements = extractRequirements(done.get(SRS_PATH) ?? '', 'FR');
  const nfrs = extractRequirements(done.get(NFR_PATH) ?? '', 'NFR');
  const frIds = requirements.map((r) => r.id);
  const planOpts = { deferred: requirements.filter((r) => r.deferred).map((r) => r.id), nfrIds: nfrs.map((r) => r.id) };
  const contextDocs = contextOf(spec, done);
  let problems: string[] = [];
  let plan: TaskPlan | null = null;
  let tokensIn = 0;
  let tokensOut = 0;

  for (let attempt = 1; attempt <= 3 && !plan; attempt++) {
    const prompt = taskPlanPrompt({ ledger, contextDocs, requirements, nfrs, problems: attempt > 1 ? problems : undefined });
    try {
      const { data, result } = await completeJson(
        ai,
        { tag: 'task-plan', model: 'reasoning', system: prompt.system, user: prompt.user, json: true, temperature: 0.2 },
        TaskPlan,
      );
      tokensIn += result.tokensIn;
      tokensOut += result.tokensOut;
      problems = validateTaskPlan(data, frIds, planOpts);
      if (problems.length === 0) plan = data;
    } catch (err) {
      if (attempt === 3) throw err;
      problems = [err instanceof Error ? err.message.slice(0, 300) : 'Invalid plan.'];
    }
  }
  if (!plan) {
    await failDoc(ctx, doc.id, `Invalid task plan: ${problems.join(' ')}`, project.id, payload.runId);
    return;
  }
  const finalPlan = plan;

  await ctx.prisma.$transaction(async (tx) => {
    const claimed = await tx.document.updateMany({
      where: { id: doc.id, status: 'generating' },
      data: { content: JSON.stringify(finalPlan, null, 2), status: 'done', inputsHash: hash, tokensIn, tokensOut, error: null },
    });
    if (claimed.count === 0) return;
    const wanted = new Map(finalPlan.tasks.map((t) => [taskFilePath(t.number, t.slug), t]));
    await tx.document.deleteMany({
      where: { projectId: project.id, path: { startsWith: 'docs/build/tasks/' }, NOT: { path: { in: [...wanted.keys()] } } },
    });
    for (const [path, t] of wanted) {
      await tx.document.upsert({
        where: { projectId_path: { projectId: project.id, path } },
        create: { projectId: project.id, path, title: `Task ${String(t.number).padStart(3, '0')}: ${t.title}`, writer: 'code', status: 'pending' },
        update: { status: 'pending', title: `Task ${String(t.number).padStart(3, '0')}: ${t.title}`, error: null },
      });
    }
    await incrementRun(tx, payload.runId);
    const notDone = await tx.document.count({ where: { projectId: project.id, status: { not: 'done' } } });
    await tx.$executeRaw`UPDATE pipeline_runs SET total = done + ${notDone} WHERE id = ${payload.runId}`;
  });
  await ctx.enqueue('schedule-generation', { projectId: project.id, runId: payload.runId });
}

export type { Prisma };
