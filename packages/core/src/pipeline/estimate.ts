import type { PackFileSpec } from '../pack/spec';
import { TASK_PLAN_PATH } from '../pack/spec';

export interface Estimate {
  aiCalls: number;
  tokens: number;
}

/** Documents checked by the G11 contradiction pass: 03-13 and PROJECT_CONTEXT. */
export function isContradictionDoc(path: string): boolean {
  return /^docs\/(0[3-9]|1[0-3])-/.test(path) || path === 'docs/build/PROJECT_CONTEXT.md';
}

/**
 * docs/27 "Estimate": 30,000 tokens per reasoning file, 15,000 per fast file, +30,000 for the task plan,
 * +20,000 per G11 batch of four documents.
 */
export function estimateGeneration(spec: PackFileSpec[]): Estimate {
  let tokens = 0;
  let aiCalls = 0;
  for (const s of spec) {
    if (s.writer !== 'ai' || s.path === TASK_PLAN_PATH) continue;
    aiCalls += 1;
    tokens += s.model === 'reasoning' ? 30_000 : 15_000;
  }
  aiCalls += 1;
  tokens += 30_000; // task plan
  const docCount = spec.filter((s) => isContradictionDoc(s.path)).length;
  const batches = Math.ceil(docCount / 4);
  aiCalls += batches;
  tokens += batches * 20_000;
  return { aiCalls, tokens };
}
