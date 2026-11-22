import { z } from 'zod';

export const CategoryEnum = z.enum([
  'business',
  'users',
  'scope',
  'technical',
  'security',
  'integrations',
  'data',
  'operations',
  'timeline',
  'risk',
]);

const FactItem = z.object({
  category: CategoryEnum,
  statement: z.string().min(3).max(300),
  quote: z.string().min(1).max(300),
  confidence: z.enum(['high', 'medium', 'low']),
});

/**
 * A chunk of a big document can hold many facts, and the model sometimes returns an odd one. Keep every fact that
 * is valid and drop the rest, so one bad item (or a long list) never fails the whole source.
 */
export const FactsResponse = z.object({
  facts: z.array(z.unknown()).transform((items): z.infer<typeof FactItem>[] =>
    items.flatMap((item) => {
      const parsed = FactItem.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  ),
});
export type FactsResponse = z.infer<typeof FactsResponse>;

export const AnalyzeResponse = z.object({
  decisions: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1).max(600),
      factIds: z.array(z.string()).min(1),
    }),
  ),
  questions: z.array(
    z
      .object({
        key: z.string().min(1),
        prompt: z.string().min(1),
        why: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(4),
        recommended: z.string().min(1),
      })
      .refine((q) => q.options.includes(q.recommended), {
        message: '"recommended" must be one of "options".',
        path: ['recommended'],
      }),
  ),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponse>;

export const TaskSchema = z.object({
  number: z.number().int().min(1),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  title: z.string().min(1),
  goal: z.string().min(1),
  dependsOn: z.array(z.number().int().min(1)),
  requirementIds: z.array(z.string()),
  areas: z.array(z.string()),
  steps: z.array(z.string().min(1)).min(3).max(12),
  tests: z.array(z.string().min(1)).min(1),
  acceptance: z.array(z.string().min(1)).min(1),
});
export type PlanTask = z.infer<typeof TaskSchema>;

export const TaskPlan = z.object({ tasks: z.array(TaskSchema).min(8).max(16) });
export type TaskPlan = z.infer<typeof TaskPlan>;

export const ContradictionsResponse = z.object({
  findings: z.array(
    z.object({
      documentPath: z.string(),
      quote: z.string(),
      conflictsWith: z.string(),
      explanation: z.string(),
    }),
  ),
});
export type ContradictionsResponse = z.infer<typeof ContradictionsResponse>;

/** Rules from docs/27 checked in code on top of the schema. Returns a list of problems (empty = valid). */
export function validateTaskPlan(
  plan: TaskPlan,
  frIds: string[],
  opts: { deferred?: string[]; nfrIds?: string[] } = {},
): string[] {
  const problems: string[] = [];
  const tasks = plan.tasks;
  tasks.forEach((t, i) => {
    if (t.number !== i + 1) problems.push(`Task numbers must run 1..n in order (found ${t.number} at position ${i + 1}).`);
    for (const d of t.dependsOn) {
      if (d >= t.number || d < 1) problems.push(`Task ${t.number} depends on ${d}, which is not a lower task number.`);
    }
  });
  if (tasks[0] && tasks[0].slug !== 'project-setup') problems.push('Task 1 slug must be "project-setup".');
  const last = tasks[tasks.length - 1];
  if (last && last.slug !== 'documentation-and-final-polish') {
    problems.push('The last task slug must be "documentation-and-final-polish".');
  }
  const covered = new Set(tasks.flatMap((t) => t.requirementIds));
  const deferred = new Set(opts.deferred ?? []);
  for (const id of frIds) {
    if (!deferred.has(id) && !covered.has(id)) problems.push(`${id} is not covered by any task.`);
  }
  for (const id of opts.nfrIds ?? []) {
    if (!covered.has(id)) problems.push(`${id} is not covered by any task.`);
  }
  const known = new Set([...frIds, ...(opts.nfrIds ?? [])]);
  const unknown = [...covered].filter((id) => !known.has(id));
  if (unknown.length > 0) problems.push(`Unknown requirement IDs (not in the SRS or the NFR document): ${unknown.join(', ')}.`);
  const wrong = [...covered].filter((id) => deferred.has(id));
  if (wrong.length > 0) problems.push(`Deferred requirements must not be in any task: ${wrong.join(', ')}.`);
  return problems;
}
