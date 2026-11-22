import type { AiClient } from '../ai/types';
import { g11Contradictions } from './contradictions';
import { DETERMINISTIC_RULES, type Finding, type GateInput } from './rules';

export function sortFindings(findings: Finding[]): Finding[] {
  const sev = { blocker: 0, warning: 1 } as const;
  return [...findings].sort((a, b) => sev[a.severity] - sev[b.severity] || a.rule.localeCompare(b.rule));
}

export function runDeterministicGates(input: GateInput): Finding[] {
  return sortFindings(DETERMINISTIC_RULES.flatMap((rule) => rule(input)));
}

/** Runs G01–G10, then the AI rule G11, and sorts by severity then rule. */
export async function runGates(input: GateInput, ai: AiClient): Promise<Finding[]> {
  const deterministic = DETERMINISTIC_RULES.flatMap((rule) => rule(input));
  const contradictions = await g11Contradictions(input, ai);
  return sortFindings([...deterministic, ...contradictions]);
}
