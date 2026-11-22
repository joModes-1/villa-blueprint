/**
 * Golden test (docs/16): runs the EU B2B portal's original requirements through the REAL pipeline and compares the
 * generated decision table with the decisions that actually built that portal.
 *
 *   AI_PROVIDER=openrouter OPENROUTER_API_KEY=sk-or-… pnpm golden
 *
 * Pass: at least 80% of expected rows match, 0 open blockers, total cost at most 3 USD.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

config({ path: path.resolve(__dirname, '../.env') });

if (process.env.AI_PROVIDER !== 'openrouter' || !process.env.OPENROUTER_API_KEY) {
  console.error('The golden test uses the real AI. Set AI_PROVIDER=openrouter and OPENROUTER_API_KEY, then run `pnpm golden` again.');
  process.exit(1);
}

async function main(): Promise<void> {
  const [{ prisma }, core, { createContext, meteredAi }, { loadEnv }, procMod, analyzeMod, schedMod, genMod, gatesMod, runsMod] = await Promise.all([
    import('@blueprint/db'),
    import('@blueprint/core'),
    import('../apps/worker/src/context'),
    import('../apps/worker/src/env'),
    import('../apps/worker/src/jobs/process-source'),
    import('../apps/worker/src/jobs/analyze-project'),
    import('../apps/worker/src/jobs/schedule-generation'),
    import('../apps/worker/src/jobs/generate-doc'),
    import('../apps/worker/src/jobs/run-gates'),
    import('../apps/worker/src/runs'),
  ]);
  type Job = { name: string; data: Record<string, string> };

  const env = loadEnv();
  const queue: Job[] = [];
  const ctx = createContext(env, {
    enqueue: async (name, data) => {
      queue.push({ name, data: data as Record<string, string> });
    },
  });
  const drain = async (): Promise<void> => {
    while (queue.length > 0) {
      const job = queue.shift() as Job;
      if (job.name === 'process-source') await procMod.processSource(ctx, job.data as never);
      else if (job.name === 'analyze-project') await analyzeMod.analyzeProject(ctx, job.data as never);
      else if (job.name === 'schedule-generation') await schedMod.scheduleGeneration(ctx, job.data as never);
      else if (job.name === 'generate-doc') await genMod.generateDoc(ctx, job.data as never);
      else if (job.name === 'run-gates') await gatesMod.runGatesJob(ctx, job.data as never);
    }
  };

  console.log('Creating the golden project…');
  const user = await prisma.user.create({ data: { email: `golden-${Date.now()}@blueprint.local`, name: 'Golden', passwordHash: 'x' } });
  const project = await prisma.project.create({ data: { userId: user.id, name: 'EU B2B Portal', mode: 'founder' } });
  await prisma.decision.createMany({ data: core.LEDGER_CATALOG.map((k) => ({ projectId: project.id, key: k.key })) });
  const srs = fs.readFileSync(path.resolve(__dirname, 'golden/eu-b2b-srs.txt'), 'utf8');
  const source = await prisma.source.create({ data: { projectId: project.id, kind: 'text', title: 'EU B2B SRS', text: srs } });

  console.log('Process and analyze…');
  await prisma.project.update({ where: { id: project.id }, data: { status: 'processing' } });
  const processRun = await runsMod.createRun(prisma, project.id, 'process', 1);
  await procMod.processSource(ctx, { sourceId: source.id, runId: processRun.id });
  await drain();

  console.log('Accepting the recommended answers…');
  const open = await prisma.question.findMany({ where: { projectId: project.id, status: 'open' } });
  const decisions = await prisma.decision.findMany({ where: { projectId: project.id } });
  for (const q of open) {
    if (!q.recommended) continue;
    const row = decisions.find((d) => d.key === q.key);
    const up = core.answerDecision({ key: q.key, value: row?.value ?? '', status: 'deferred', version: row?.version ?? 0 }, q.recommended, q.id, 'Accepted recommended answer');
    await prisma.decision.update({
      where: { projectId_key: { projectId: project.id, key: q.key } },
      data: { value: up.value, status: up.status, rationale: up.rationale, sourceRefs: up.sourceRefs, version: up.version },
    });
    await prisma.question.update({ where: { id: q.id }, data: { status: 'answered', answer: up.value, answeredAt: new Date() } });
  }
  const after = await prisma.decision.findMany({ where: { projectId: project.id } });
  for (const up of core.finishInterview('founder', after.map((d) => ({ key: d.key, value: d.value, status: d.status, version: d.version })))) {
    await prisma.decision.update({
      where: { projectId_key: { projectId: project.id, key: up.key } },
      data: { value: up.value, status: up.status, rationale: up.rationale, sourceRefs: up.sourceRefs, version: up.version },
    });
  }
  const missing = after.filter((d) => core.p0Keys().includes(d.key) && d.value.trim() === '' && !core.catalogByKey(d.key)?.founderDefault);
  if (missing.length > 0) console.warn(`Warning: P0 keys still empty: ${missing.map((m) => m.key).join(', ')}`);

  console.log('Generating the pack (real AI; this takes a while)…');
  await prisma.document.createMany({ data: core.PACK_SPEC.map((s) => ({ projectId: project.id, path: s.path, title: s.title, writer: s.writer })) });
  await prisma.project.update({ where: { id: project.id }, data: { status: 'generating' } });
  const genRun = await runsMod.createRun(prisma, project.id, 'generate', core.PACK_SPEC.length);
  queue.push({ name: 'schedule-generation', data: { projectId: project.id, runId: genRun.id } });
  await drain();

  const finalProject = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
  const findings = await prisma.gateFinding.findMany({ where: { projectId: project.id } });
  const blockers = findings.filter((f) => f.severity === 'blocker' && f.status === 'open');

  // Judge the generated decision table against the expected one, one yes/no per row.
  const index = (await prisma.document.findUnique({ where: { projectId_path: { projectId: project.id, path: 'docs/00-index.md' } } }))?.content ?? '';
  const expectedRows = core.parseTables(fs.readFileSync(path.resolve(__dirname, 'golden/eu-b2b-expected-decisions.md'), 'utf8'));
  const judge = meteredAi(ctx, project);
  let matched = 0;
  console.log('\nArea | match');
  for (const [area, value] of expectedRows) {
    const { data } = await core.completeJson(
      judge,
      {
        tag: 'golden-judge',
        model: 'fast',
        system: 'You compare two product decisions. Answer whether the GENERATED table contains a row for the same area whose value means the same as EXPECTED. Return JSON only: {"match": true|false}.',
        user: `EXPECTED\nArea: ${area}\nValue: ${value}\n\nGENERATED\n${index}`,
        json: true,
        temperature: 0,
      },
      z.object({ match: z.boolean() }),
    );
    if (data.match) matched += 1;
    console.log(`${area} | ${data.match ? 'yes' : 'NO'}`);
  }

  const usage = await prisma.usageEvent.aggregate({ where: { projectId: project.id }, _sum: { costUsd: true } });
  const cost = Number(usage._sum.costUsd ?? 0);
  const pct = expectedRows.length ? Math.round((matched / expectedRows.length) * 100) : 0;
  console.log(`\nStatus: ${finalProject.status}`);
  console.log(`Gate findings: ${findings.length} (${blockers.length} open blockers)`);
  for (const b of blockers) console.log(`  [${b.rule}] ${b.documentPath ?? ''} ${b.message}`);
  console.log(`Decision match: ${matched}/${expectedRows.length} (${pct}%)`);
  console.log(`Total cost: $${cost.toFixed(2)}`);

  const pass = pct >= 80 && blockers.length === 0 && cost <= 3;
  console.log(pass ? '\nGOLDEN TEST: PASS' : '\nGOLDEN TEST: FAIL (needs ≥ 80% match, 0 blockers, ≤ 3 USD)');
  await prisma.$disconnect();
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
