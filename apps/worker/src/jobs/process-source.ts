import {
  chunkText,
  completeJson,
  extractPrompt,
  FactsResponse,
  filterFacts,
  parseSource,
  type JobPayloads,
} from '@blueprint/core';
import type { Prisma } from '@blueprint/db';
import { meteredAi, type WorkerContext } from '../context';
import { createRun, finishRun, incrementRun } from '../runs';

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Chunks of one source sent to the model at the same time. */
const EXTRACT_PARALLEL = 8;

interface Parsed {
  text: string;
  meta: Prisma.InputJsonObject;
  error: string | null;
}

async function parse(source: {
  kind: Parameters<typeof parseSource>[0];
  raw: Buffer | Uint8Array | null;
  text: string | null;
}): Promise<Parsed> {
  try {
    const raw = source.raw ? Buffer.from(source.raw) : null;
    const out = await parseSource(source.kind, { raw, text: source.text });
    return { text: out.text, meta: { ...out.meta }, error: null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unreadable file';
    return { text: '', meta: {}, error: `PARSE_FAILED: ${reason}`.slice(0, 300) };
  }
}

/**
 * docs/27 stage `process`, one job per source: parse, cap, extract facts per chunk, save, count.
 * A parse error marks the source `failed` but never fails the run.
 */
export async function processSource(
  ctx: WorkerContext,
  payload: JobPayloads['process-source'],
): Promise<void> {
  const started = Date.now();
  const { prisma } = ctx;
  const source = await prisma.source.findUnique({
    where: { id: payload.sourceId },
    include: { project: { select: { id: true, userId: true, deletedAt: true } } },
  });
  if (!source || source.project.deletedAt) return;
  if (source.status === 'parsed') return; // duplicate delivery: already counted

  const project = source.project;
  const parsed = await parse(source);
  let facts: { category: Prisma.FactCreateManyInput['category']; statement: string; quote: string; confidence: Prisma.FactCreateManyInput['confidence'] }[] = [];
  let text = parsed.text;
  const meta: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(parsed.meta)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') meta[k] = v;
  }

  // A file that yields no text must say so; it must not look like a successful read.
  if (!parsed.error && text.trim() === '') {
    parsed.error = 'PARSE_FAILED: no readable text was found in this file.';
  }

  if (!parsed.error) {
    // No per-project size cap: every source is read in full. Cost is bounded by the token budget instead.
    const existing = new Set(
      (await prisma.fact.findMany({ where: { projectId: project.id }, select: { statement: true } })).map((f) =>
        collapse(f.statement),
      ),
    );
    const ai = meteredAi(ctx, project);
    const chunks = chunkText(text);
    // Resume point. A big source takes many slow model calls, so facts are saved after every batch together
    // with `meta.extractedChunks`; a retried or restarted job continues from the first unfinished chunk instead
    // of redoing (and re-paying for) everything. Before this, all facts were held in memory until the end, and
    // a job that outlived its queue expiry restarted from chunk 1 every time.
    const priorMeta = (source.meta ?? {}) as Record<string, unknown>;
    const resumeFrom =
      typeof priorMeta.extractedChunks === 'number' ? Math.min(priorMeta.extractedChunks, chunks.length) : 0;
    if (resumeFrom > 0) {
      ctx.logger.info({ queue: 'process-source', projectId: project.id, resumeFrom, chunks: chunks.length }, 'resuming');
    }
    // A few chunks at a time: the model calls are slow, but they do not depend on each other. Results are
    // filtered in chunk order, so duplicate detection behaves exactly as when they ran one by one.
    for (let start = resumeFrom; start < chunks.length; start += EXTRACT_PARALLEL) {
      const batch = chunks.slice(start, start + EXTRACT_PARALLEL);
      const answers = await Promise.all(
        batch.map(async (chunk, offset) => {
          const prompt = extractPrompt(source.title, start + offset + 1, chunks.length, chunk);
          const { data } = await completeJson(
            ai,
            // Extraction is pattern matching, not deliberation: thinking off (16 s instead of 5+ minutes per
            // chunk in testing). The token cap is far above a normal answer; it only stops a runaway.
            { tag: 'extract', model: 'fast', system: prompt.system, user: prompt.user, json: true, temperature: 0.1, reasoning: false, maxTokens: 12_000 },
            FactsResponse,
          );
          return data;
        }),
      );
      let batchFacts: typeof facts = [];
      answers.forEach((data, offset) => {
        batchFacts = batchFacts.concat(filterFacts(data.facts, batch[offset] as string, existing));
      });
      // Checkpoint: this batch's facts and the progress counter commit together, and only while the source
      // is still pending, so a source that already finished (or was retried elsewhere) is never written again.
      const reached = start + batch.length;
      meta.extractedChunks = reached;
      meta.totalChunks = chunks.length;
      await prisma.$transaction(async (tx) => {
        const still = await tx.source.updateMany({ where: { id: source.id, status: 'pending' }, data: { meta } });
        if (still.count === 1 && batchFacts.length > 0) {
          await tx.fact.createMany({
            data: batchFacts.map((f) => ({ ...f, projectId: project.id, sourceId: source.id })),
          });
        }
      });
      facts = facts.concat(batchFacts);
    }
  }

  const { done, total } = await prisma.$transaction(async (tx) => {
    // The status guard makes a duplicate delivery a no-op and keeps the counter exact. Facts were already
    // saved batch by batch above.
    const claimed = await tx.source.updateMany({
      where: { id: source.id, status: { in: ['pending', 'failed'] } },
      data: parsed.error
        ? { status: 'failed', error: parsed.error, raw: null }
        : { status: 'parsed', error: null, raw: null, text, meta, sizeBytes: Buffer.byteLength(text) },
    });
    if (claimed.count === 0) return { done: -1, total: -1 };
    return incrementRun(tx, payload.runId);
  });

  ctx.logger.info(
    { queue: 'process-source', projectId: project.id, runId: payload.runId, facts: facts.length, ms: Date.now() - started, outcome: parsed.error ? 'source-failed' : 'ok' },
    'job done',
  );

  if (done >= 0 && done === total) {
    await finishRun(prisma, payload.runId);
    const analyzeRun = await createRun(prisma, project.id, 'analyze', 1);
    await ctx.enqueue('analyze-project', { projectId: project.id, runId: analyzeRun.id });
  }
}
