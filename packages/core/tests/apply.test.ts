import { describe, expect, it } from 'vitest';
import { LEDGER_CATALOG, applyAnalysis, finishInterview, answerDecision, type LedgerRow } from '../src';
import type { AnalyzeResponse } from '../src/pipeline/schemas';

const emptyLedger = (): LedgerRow[] =>
  LEDGER_CATALOG.map((k) => ({ key: k.key, value: '', status: 'deferred' as const, version: 0 }));

const analysis = (over: Partial<AnalyzeResponse> = {}): AnalyzeResponse => ({ decisions: [], questions: [], ...over });

describe('applyAnalysis', () => {
  it('drops unknown keys and unknown fact ids', () => {
    const out = applyAnalysis({
      mode: 'founder',
      ledger: emptyLedger(),
      factIds: new Set(['f1']),
      questions: [],
      analysis: analysis({
        decisions: [
          { key: 'nope.key', value: 'x', factIds: ['f1'] },
          { key: 'product.one_liner', value: 'x', factIds: ['ghost'] },
          { key: 'stack.backend', value: 'Express', factIds: ['f1'] },
        ],
      }),
    });
    expect(out.decisionUpserts.map((d) => d.key)).toEqual(['stack.backend']);
    const d = out.decisionUpserts[0];
    expect(d?.status).toBe('confirmed');
    expect(d?.rationale).toBe('From sources');
    expect(d?.sourceRefs).toEqual({ factIds: ['f1'] });
    expect(d?.version).toBe(1);
  });

  it('never overwrites a user-answered decision', () => {
    const ledger = emptyLedger().map((r) =>
      r.key === 'stack.backend' ? { ...r, value: 'Mine', status: 'confirmed' as const, sourceRefs: { questionId: 'q1' } } : r,
    );
    const out = applyAnalysis({
      mode: 'founder',
      ledger,
      factIds: new Set(['f1']),
      questions: [],
      analysis: analysis({ decisions: [{ key: 'stack.backend', value: 'Other', factIds: ['f1'] }] }),
    });
    expect(out.decisionUpserts.find((d) => d.key === 'stack.backend')).toBeUndefined();
    expect(out.ledger.find((r) => r.key === 'stack.backend')?.value).toBe('Mine');
  });

  it('creates a catalog question for every undecided P0 key, with the founder default as the only option', () => {
    const out = applyAnalysis({ mode: 'founder', ledger: emptyLedger(), factIds: new Set(), questions: [], analysis: analysis() });
    const p0 = LEDGER_CATALOG.filter((k) => k.priority === 'P0');
    expect(out.questionCreates).toHaveLength(p0.length);
    const backend = out.questionCreates.find((q) => q.key === 'stack.backend');
    expect(backend?.options).toEqual(['NestJS + TypeScript']);
    expect(backend?.recommended).toBe('NestJS + TypeScript');
    const noDefault = out.questionCreates.find((q) => q.key === 'product.problem');
    expect(noDefault?.options).toEqual([]);
    expect(noDefault?.recommended).toBeNull();
    expect(out.nextStatus).toBe('interviewing');
  });

  it('expert mode also asks P1 keys; founder mode ignores model questions about P1 keys', () => {
    const q = { key: 'product.success', prompt: 'p', why: 'w', options: ['a', 'b'], recommended: 'a' };
    const founder = applyAnalysis({ mode: 'founder', ledger: emptyLedger(), factIds: new Set(), questions: [], analysis: analysis({ questions: [q] }) });
    expect(founder.questionCreates.find((x) => x.key === 'product.success')).toBeUndefined();
    const expert = applyAnalysis({ mode: 'expert', ledger: emptyLedger(), factIds: new Set(), questions: [], analysis: analysis({ questions: [q] }) });
    expect(expert.questionCreates.find((x) => x.key === 'product.success')?.options).toEqual(['a', 'b']);
  });

  it('uses model questions in place of catalog ones and deletes stale open questions', () => {
    const out = applyAnalysis({
      mode: 'founder',
      ledger: emptyLedger(),
      factIds: new Set(['f1']),
      questions: [
        { id: 'old1', key: 'stack.frontend', status: 'open' },
        { id: 'old2', key: 'product.one_liner', status: 'open' },
        { id: 'done1', key: 'stack.database', status: 'answered' },
      ],
      analysis: analysis({
        decisions: [{ key: 'product.one_liner', value: 'A thing', factIds: ['f1'] }],
        questions: [{ key: 'stack.backend', prompt: 'Which?', why: 'Because', options: ['A', 'B'], recommended: 'B' }],
      }),
    });
    expect(out.questionCreates.find((q) => q.key === 'stack.backend')?.recommended).toBe('B');
    expect(out.questionDeleteIds).toContain('old2'); // key now decided
    expect(out.questionDeleteIds).not.toContain('old1'); // still open, no replacement
    expect(out.questionCreates.find((q) => q.key === 'stack.frontend')).toBeUndefined();
    expect(out.questionDeleteIds).not.toContain('done1');
  });

  it('runs finishInterview when nothing is left to ask', () => {
    const ledger = emptyLedger();
    const p0 = LEDGER_CATALOG.filter((k) => k.priority === 'P0');
    const decisions = p0.map((k) => ({ key: k.key, value: `Value for ${k.key}`, factIds: ['f1'] }));
    const out = applyAnalysis({ mode: 'founder', ledger, factIds: new Set(['f1']), questions: [], analysis: analysis({ decisions }) });
    expect(out.nextStatus).toBe('ready_to_generate');
    expect(out.questionCreates).toHaveLength(0);
    const p1 = out.decisionUpserts.find((d) => d.key === 'product.success');
    expect(p1?.status).toBe('assumed');
    expect(p1?.rationale).toBe('Founder-mode default');
  });
});

describe('finishInterview', () => {
  it('founder: P1 and defaulted P0 become assumed; P0 without default stay empty', () => {
    const ups = finishInterview('founder', emptyLedger());
    const keys = ups.map((u) => u.key);
    expect(keys).toContain('stack.backend'); // P0 with default
    expect(keys).toContain('nfr.availability'); // P1
    expect(keys).not.toContain('product.problem'); // P0 without default
    expect(ups.every((u) => u.status === 'assumed' && u.rationale === 'Founder-mode default')).toBe(true);
  });

  it('expert: uses the "not answered" rationale and keeps existing values', () => {
    const ledger = emptyLedger().map((r) => (r.key === 'stack.backend' ? { ...r, value: 'Go', status: 'confirmed' as const } : r));
    const ups = finishInterview('expert', ledger);
    expect(ups.find((u) => u.key === 'stack.backend')).toBeUndefined();
    expect(ups[0]?.rationale).toBe('Default (not answered)');
  });

  it('answerDecision records the question id and bumps the version', () => {
    const row: LedgerRow = { key: 'stack.backend', value: '', status: 'deferred', version: 2 };
    const up = answerDecision(row, '  Rails ', 'q9', 'Answered by the user');
    expect(up).toMatchObject({ value: 'Rails', status: 'confirmed', version: 3, sourceRefs: { questionId: 'q9' } });
  });
});
