import type { AnalyzeResponse } from '../pipeline/schemas';
import { catalogByKey, hasFounderDefault, LEDGER_CATALOG } from './catalog';
import type { LedgerRow } from './table';

export type Mode = 'founder' | 'expert';

export interface ExistingQuestion {
  id: string;
  key: string;
  status: 'open' | 'answered' | 'skipped';
}

export interface DecisionUpsert {
  key: string;
  value: string;
  status: 'confirmed' | 'assumed' | 'deferred';
  rationale: string;
  sourceRefs: { factIds?: string[]; questionId?: string; edited?: boolean };
  version: number;
}

export interface NewQuestion {
  key: string;
  prompt: string;
  why: string;
  options: string[];
  recommended: string | null;
}

export interface AnalysisOutcome {
  decisionUpserts: DecisionUpsert[];
  questionCreates: NewQuestion[];
  /** Ids of open questions to delete (decided keys, or replaced by a new question for the same key). */
  questionDeleteIds: string[];
  /** The ledger after all upserts, in the same order as the input. */
  ledger: LedgerRow[];
  /** `interviewing` when a question is open afterwards, otherwise `ready_to_generate` (finishInterview ran). */
  nextStatus: 'interviewing' | 'ready_to_generate';
}

const hasValue = (r: LedgerRow | undefined): boolean => !!r && r.value.trim() !== '';

function toUpsert(row: LedgerRow, patch: Partial<DecisionUpsert>): DecisionUpsert {
  return {
    key: row.key,
    value: patch.value ?? row.value,
    status: patch.status ?? row.status,
    rationale: patch.rationale ?? row.rationale ?? '',
    sourceRefs: patch.sourceRefs ?? row.sourceRefs ?? {},
    version: (row.version ?? 0) + 1,
  };
}

/**
 * finishInterview (docs/27): every P1 key, and every P0 key that has a founderDefault, that still has no
 * value gets its founderDefault as `assumed`. Returns the upserts; the caller moves the status to
 * `ready_to_generate`.
 */
export function finishInterview(mode: Mode, ledger: LedgerRow[]): DecisionUpsert[] {
  const rationale = mode === 'founder' ? 'Founder-mode default' : 'Default (not answered)';
  const byKey = new Map(ledger.map((r) => [r.key, r]));
  const out: DecisionUpsert[] = [];
  for (const spec of LEDGER_CATALOG) {
    const row = byKey.get(spec.key) ?? { key: spec.key, value: '', status: 'deferred' as const };
    if (hasValue(row)) continue;
    if (!hasFounderDefault(spec)) continue;
    if (spec.priority === 'P0' || spec.priority === 'P1') {
      out.push(toUpsert(row, { value: spec.founderDefault, status: 'assumed', rationale, sourceRefs: {} }));
    }
  }
  return out;
}

/** Phrases that point at "the docs I wrote" or hand the decision back to the tool instead of deciding. */
const NON_ANSWER =
  /\b(as in|like in|see|per)\s+(the\s+)?(docs?|documents?|files?|above|attached|brief)\b|\bi\s+(described|explained|wrote|gave|uploaded)\b|\b(you|u)\s+(can|could|may|should|decide|choose|pick|create)\b|\bup to you\b|\bthats?\s+on\s+you\b|\byour (call|choice)\b|^(n\/?a|none|idk|tbd|todo|skip|later|whatever|anything)\.?$/i;

/**
 * Why an answer cannot become a ledger decision, or null when it can. A decision is copied into every document,
 * so "as in docs I described" or "you decide" would poison the pack.
 */
export function answerProblem(answer: string): string | null {
  const text = answer.trim();
  if (text.length < 3) return 'Give a real answer of at least 3 characters.';
  if (NON_ANSWER.test(text)) {
    return 'That points elsewhere or hands the decision back. Write the actual decision (for example the roles and what each can do), or skip the question.';
  }
  return null;
}

/** Saves one answered question as a decision (used by the API for answer and accept-recommended). */
export function answerDecision(row: LedgerRow, answer: string, questionId: string, rationale: string): DecisionUpsert {
  return toUpsert(row, { value: answer.trim(), status: 'confirmed', rationale, sourceRefs: { questionId } });
}

/** docs/27 "Post-processing in code (applyAnalysis)". Pure: returns what to write, writes nothing. */
export function applyAnalysis(input: {
  mode: Mode;
  ledger: LedgerRow[];
  factIds: Set<string>;
  questions: ExistingQuestion[];
  analysis: AnalyzeResponse;
}): AnalysisOutcome {
  const { mode, analysis } = input;
  const ledger = new Map<string, LedgerRow>(input.ledger.map((r) => [r.key, { ...r }]));
  for (const spec of LEDGER_CATALOG) {
    if (!ledger.has(spec.key)) ledger.set(spec.key, { key: spec.key, value: '', status: 'deferred' });
  }
  const upserts = new Map<string, DecisionUpsert>();

  // 1-3. Valid decisions become confirmed, unless a user answer already holds the key.
  for (const d of analysis.decisions) {
    const row = ledger.get(d.key);
    if (!row || !catalogByKey(d.key)) continue;
    if (!d.factIds.every((id) => input.factIds.has(id))) continue;
    if (row.sourceRefs?.questionId || row.sourceRefs?.edited) continue;
    const up = toUpsert(row, {
      value: d.value.trim(),
      status: 'confirmed',
      rationale: 'From sources',
      sourceRefs: { factIds: d.factIds },
    });
    upserts.set(d.key, up);
    ledger.set(d.key, { ...row, ...up });
  }

  const open = input.questions.filter((q) => q.status === 'open');
  const deleteIds = new Set<string>();
  const creates = new Map<string, NewQuestion>();
  const asksFor = (key: string): boolean =>
    mode === 'expert' || catalogByKey(key)?.priority === 'P0';

  // Questions written by the model, for keys that are still undecided and that this mode asks about.
  for (const q of analysis.questions) {
    const spec = catalogByKey(q.key);
    if (!spec || !asksFor(q.key) || hasValue(ledger.get(q.key)) || creates.has(q.key)) continue;
    creates.set(q.key, { key: q.key, prompt: q.prompt, why: q.why, options: q.options, recommended: q.recommended });
  }
  // 4. Every key that must be asked, still empty, and without a question gets one from the catalog.
  for (const spec of LEDGER_CATALOG) {
    if (!asksFor(spec.key) || hasValue(ledger.get(spec.key)) || creates.has(spec.key)) continue;
    if (open.some((q) => q.key === spec.key)) continue;
    const def = hasFounderDefault(spec) ? spec.founderDefault : null;
    creates.set(spec.key, {
      key: spec.key,
      prompt: spec.question,
      why: `Decides how ${spec.area.toLowerCase()} is specified across the pack.`,
      options: def ? [def] : [],
      recommended: def,
    });
  }
  // 5. Open questions for keys that now have values, or that are being replaced, are deleted.
  for (const q of open) {
    if (hasValue(ledger.get(q.key)) || creates.has(q.key)) deleteIds.add(q.id);
  }

  const remainingOpen = open.filter((q) => !deleteIds.has(q.id)).length + creates.size;
  let nextStatus: AnalysisOutcome['nextStatus'] = 'interviewing';
  if (remainingOpen === 0) {
    for (const up of finishInterview(mode, [...ledger.values()])) {
      upserts.set(up.key, up);
      const row = ledger.get(up.key);
      if (row) ledger.set(up.key, { ...row, ...up });
    }
    nextStatus = 'ready_to_generate';
  }

  return {
    decisionUpserts: [...upserts.values()],
    questionCreates: [...creates.values()],
    questionDeleteIds: [...deleteIds],
    ledger: [...ledger.values()],
    nextStatus,
  };
}
