import {
  computeHashes,
  readyFiles,
  renderCodeFile,
  specWithTaskFiles,
  transition,
  type JobPayloads,
  type LedgerRow,
  type PathStatus,
} from '@blueprint/core';
import type { Prisma } from '@blueprint/db';
import type { WorkerContext } from '../context';
import { createRun, failRun, finishRun, incrementRun } from '../runs';

/**
 * docs/27 `schedule-generation`. Serialized per project by an advisory lock, so two schedulers can never
 * enqueue the same document. Code-written files render here, inside the lock.
 */
export async function scheduleGeneration(ctx: WorkerContext, payload: JobPayloads['schedule-generation']): Promise<void> {
  const { prisma } = ctx;
  const toEnqueue: string[] = [];
  let gateRunId: string | null = null;
  let failedNothingLeft = false;

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payload.projectId}))`;
      const project = await tx.project.findFirst({ where: { id: payload.projectId, deletedAt: null } });
      if (!project || project.status !== 'generating') return;

      const docs = await tx.document.findMany({ where: { projectId: project.id } });
      const decisions = await tx.decision.findMany({ where: { projectId: project.id } });
      const questions = await tx.question.findMany({ where: { projectId: project.id }, select: { key: true, prompt: true, status: true } });
      const ledger: LedgerRow[] = decisions.map((d) => ({ key: d.key, value: d.value, status: d.status, rationale: d.rationale }));
      const spec = specWithTaskFiles(docs.map((d) => d.path));
      const hashes = computeHashes(spec, ledger);
      const status = new Map<string, PathStatus>(docs.map((d) => [d.path, d.status]));
      const content = new Map<string, string>(docs.filter((d) => d.status === 'done').map((d) => [d.path, d.content]));
      const idByPath = new Map(docs.map((d) => [d.path, d.id]));

      // Render code-written files until nothing new is unblocked.
      for (;;) {
        const code = readyFiles(spec, status).filter((s) => s.writer === 'code' && idByPath.has(s.path));
        if (code.length === 0) break;
        for (const s of code) {
          const text = renderCodeFile(s.path, { projectName: project.name, ledger, questions, docs: content });
          await tx.document.update({
            where: { id: idByPath.get(s.path) as string },
            data: { content: text, status: 'done', inputsHash: hashes.get(s.path) ?? '', error: null },
          });
          status.set(s.path, 'done');
          content.set(s.path, text);
          await incrementRun(tx, payload.runId);
        }
      }

      // AI-written files that are ready move to `generating` here, so no other scheduler can take them.
      const ai = readyFiles(spec, status).filter((s) => s.writer === 'ai' && idByPath.has(s.path));
      for (const s of ai) {
        const id = idByPath.get(s.path) as string;
        await tx.document.update({ where: { id }, data: { status: 'generating' } });
        status.set(s.path, 'generating');
        toEnqueue.push(id);
      }

      const values = [...status.values()];
      const generating = values.filter((v) => v === 'generating').length;
      const failed = values.filter((v) => v === 'failed').length;
      if (values.every((v) => v === 'done')) {
        await tx.project.update({ where: { id: project.id }, data: { status: transition(project.status, 'docs_done') } });
        gateRunId = (await createRun(tx, project.id, 'gate', 1)).id;
        await finishRun(tx, payload.runId);
      } else if (failed > 0 && generating === 0) {
        failedNothingLeft = true;
      }
    },
    { timeout: 60_000, maxWait: 30_000 },
  );

  if (failedNothingLeft) {
    await failRun(prisma, payload.runId, 'Some documents could not be generated. Retry to continue.');
    return;
  }
  for (const documentId of toEnqueue) await ctx.enqueue('generate-doc', { documentId, runId: payload.runId });
  if (gateRunId) await ctx.enqueue('run-gates', { projectId: payload.projectId, runId: gateRunId });
}

export type { Prisma };
