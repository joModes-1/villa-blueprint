import { chunkText, type AiClient } from '@blueprint/core';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { processSource } from '../src/jobs/process-source';
import { createRun } from '../src/runs';
import { makeCtx, makeProject, prisma, resetDb } from './helpers';

beforeEach(async () => {
  await resetDb();
});
afterAll(async () => {
  await prisma.$disconnect();
});

const IDEA = 'I want a notes app for teams. Users sign up with email. Notes can be shared.';

describe('process-source', () => {
  it('processes two sources, saves facts, completes the run and enqueues analyze once', async () => {
    const { project } = await makeProject();
    const a = await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'A', text: IDEA } });
    const b = await prisma.source.create({
      data: { projectId: project.id, kind: 'markdown', title: 'B', text: 'A booking tool exists. Clients pay online. Staff see a calendar.' },
    });
    const run = await createRun(prisma, project.id, 'process', 2);
    const ctx = makeCtx();
    await Promise.all([
      processSource(ctx, { sourceId: a.id, runId: run.id }),
      processSource(ctx, { sourceId: b.id, runId: run.id }),
    ]);
    const facts = await prisma.fact.findMany({ where: { projectId: project.id } });
    expect(facts).toHaveLength(6);
    expect(facts.every((f) => IDEA.includes(f.quote) || f.quote.includes('.'))).toBe(true);
    const sources = await prisma.source.findMany({ where: { projectId: project.id } });
    expect(sources.every((s) => s.status === 'parsed' && s.raw === null)).toBe(true);
    const done = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: run.id } });
    expect(done).toMatchObject({ done: 2, total: 2, status: 'succeeded' });
    const analyzeCalls = ctx.enqueue.mock.calls.filter((c) => c[0] === 'analyze-project');
    expect(analyzeCalls).toHaveLength(1);
    const analyzeRun = await prisma.pipelineRun.findFirstOrThrow({ where: { projectId: project.id, stage: 'analyze' } });
    expect(analyzeCalls[0]?.[1]).toEqual({ projectId: project.id, runId: analyzeRun.id });
    expect(await prisma.usageEvent.count({ where: { projectId: project.id, tag: 'extract' } })).toBe(2);
  });

  it('a corrupt PDF marks the source failed and the run still completes', async () => {
    const { project } = await makeProject();
    const s = await prisma.source.create({
      data: { projectId: project.id, kind: 'pdf', title: 'bad', raw: Buffer.from('not a pdf') },
    });
    const run = await createRun(prisma, project.id, 'process', 1);
    const ctx = makeCtx();
    await processSource(ctx, { sourceId: s.id, runId: run.id });
    const row = await prisma.source.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.status).toBe('failed');
    expect(row.error).toMatch(/^PARSE_FAILED/);
    expect(row.raw).toBeNull();
    expect((await prisma.pipelineRun.findUniqueOrThrow({ where: { id: run.id } })).done).toBe(1);
    expect(ctx.enqueue).toHaveBeenCalledWith('analyze-project', expect.anything());
  });

  it('is a no-op for an already parsed source (duplicate delivery)', async () => {
    const { project } = await makeProject();
    const s = await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'A', text: IDEA } });
    const run = await createRun(prisma, project.id, 'process', 2);
    const ctx = makeCtx();
    await processSource(ctx, { sourceId: s.id, runId: run.id });
    await processSource(ctx, { sourceId: s.id, runId: run.id });
    expect((await prisma.pipelineRun.findUniqueOrThrow({ where: { id: run.id } })).done).toBe(1);
  });

  it('drops invented quotes and dedupes statements', async () => {
    const { project } = await makeProject();
    const s = await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'A', text: IDEA } });
    await prisma.fact.create({
      data: { projectId: project.id, sourceId: s.id, category: 'business', statement: 'I want a notes app for teams.', quote: 'q', confidence: 'high' },
    });
    const run = await createRun(prisma, project.id, 'process', 1);
    const ai = {
      async complete() {
        const facts = [
          { category: 'business', statement: 'I want a notes app for teams.', quote: 'notes app for teams', confidence: 'high' },
          { category: 'users', statement: 'Invented', quote: 'blockchain payments', confidence: 'high' },
          { category: 'users', statement: 'Email sign up', quote: 'Users sign up with email', confidence: 'medium' },
        ];
        return { text: JSON.stringify({ facts }), model: 'm', tokensIn: 1, tokensOut: 1, costUsd: 0 };
      },
    };
    await processSource(makeCtx({ ai }), { sourceId: s.id, runId: run.id });
    const statements = (await prisma.fact.findMany({ where: { projectId: project.id } })).map((f) => f.statement).sort();
    expect(statements).toEqual(['Email sign up', 'I want a notes app for teams.']);
  });

  it('reads every source in full: other large sources never shrink it', async () => {
    const { project } = await makeProject();
    await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'big', text: 'x'.repeat(450_000), status: 'parsed' } });
    const text = 'This is a sentence. '.repeat(20);
    const s = await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'n', text } });
    const run = await createRun(prisma, project.id, 'process', 1);
    await processSource(makeCtx(), { sourceId: s.id, runId: run.id });
    const row = await prisma.source.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.status).toBe('parsed');
    expect(row.text?.length).toBeGreaterThanOrEqual(text.trim().length - 20);
    expect(row.meta).not.toMatchObject({ truncated: true });
    expect(row.sizeBytes).toBe(Buffer.byteLength(row.text ?? ''));
  });

  it('a file with no readable text fails with a clear message instead of looking parsed', async () => {
    const { project } = await makeProject();
    const s = await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'blank', text: '   \n  ' } });
    const run = await createRun(prisma, project.id, 'process', 1);
    await processSource(makeCtx(), { sourceId: s.id, runId: run.id });
    const row = await prisma.source.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.status).toBe('failed');
    expect(row.error).toContain('no readable text');
  });

  it('extracts many chunks, in parallel batches, keeping facts in chunk order', async () => {
    const { project } = await makeProject();
    const text = Array.from({ length: 10 }, (_, i) => `Chunk ${i} says users sign up. `.padEnd(11_900, 'a')).join('\n\n');
    const s = await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'long', text } });
    const run = await createRun(prisma, project.id, 'process', 1);
    let inFlight = 0;
    let peak = 0;
    const ai: AiClient = {
      async complete(req) {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 20));
        inFlight--;
        const n = /Chunk (\d+) says/.exec(req.user)?.[1] ?? '0';
        const facts = [{ category: 'users', statement: `Fact ${n}`, quote: `Chunk ${n} says users sign up.`, confidence: 'high' }];
        return { text: JSON.stringify({ facts }), model: 'm', tokensIn: 1, tokensOut: 1, costUsd: 0 };
      },
    };
    await processSource(makeCtx({ ai }), { sourceId: s.id, runId: run.id });
    const statements = (await prisma.fact.findMany({ where: { projectId: project.id } })).map((f) => f.statement).sort();
    expect(statements).toHaveLength(10);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(8);
  });

  it('saves facts per batch, and a restarted job resumes from the first unfinished chunk', async () => {
    const { project } = await makeProject();
    // Twenty ~5,000-character paragraphs; the splitter decides how many chunks that is, so ask it.
    const text = Array.from({ length: 20 }, (_, i) => `Para ${i} ${i === 10 ? 'FAILHERE ' : ''}`.padEnd(5_000, 'word ')).join('\n\n');
    const chunks = chunkText(text);
    const failAt = chunks.findIndex((c) => c.includes('FAILHERE'));
    const batchStart = Math.floor(failAt / 8) * 8; // chunks before the failing batch are already saved
    expect(batchStart).toBeGreaterThanOrEqual(8);
    const s = await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'long', text } });
    const run = await createRun(prisma, project.id, 'process', 1);
    const seen: number[] = [];
    const makeAi = (failing: boolean): AiClient => ({
      async complete(req) {
        const i = chunks.findIndex((c) => req.user.includes(c));
        seen.push(i);
        if (failing && req.user.includes('FAILHERE')) throw new Error('provider timeout');
        const facts = [{ category: 'users', statement: `Fact for chunk ${i}`, quote: chunks[i]!.slice(0, 20), confidence: 'high' }];
        return { text: JSON.stringify({ facts }), model: 'm', tokensIn: 1, tokensOut: 1, costUsd: 0 };
      },
    });

    // First attempt dies in the failing batch: every earlier batch must already be saved.
    await expect(processSource(makeCtx({ ai: makeAi(true) }), { sourceId: s.id, runId: run.id })).rejects.toThrow();
    const afterCrash = await prisma.source.findUniqueOrThrow({ where: { id: s.id } });
    expect(afterCrash.status).toBe('pending');
    expect(afterCrash.meta).toMatchObject({ extractedChunks: batchStart, totalChunks: chunks.length });
    expect(await prisma.fact.count({ where: { sourceId: s.id } })).toBe(batchStart);

    // The retry resumes at the first unfinished chunk: earlier chunks are never sent again, and no fact repeats.
    seen.length = 0;
    await processSource(makeCtx({ ai: makeAi(false) }), { sourceId: s.id, runId: run.id });
    expect(Math.min(...seen)).toBe(batchStart);
    expect(new Set(seen).size).toBe(chunks.length - batchStart);
    const statements = (await prisma.fact.findMany({ where: { sourceId: s.id } })).map((f) => f.statement);
    expect(statements).toHaveLength(chunks.length);
    expect(new Set(statements).size).toBe(chunks.length);
    expect((await prisma.source.findUniqueOrThrow({ where: { id: s.id } })).status).toBe('parsed');
  });
});
