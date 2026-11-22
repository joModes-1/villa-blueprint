import { z } from 'zod';

export const ProjectModeSchema = z.enum(['founder', 'expert']);
export const ProjectStatusSchema = z.enum([
  'draft',
  'processing',
  'interviewing',
  'ready_to_generate',
  'generating',
  'gating',
  'ready',
  'blocked',
  'stale',
  'failed',
]);

export const ProjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: ProjectModeSchema,
  status: ProjectStatusSchema,
  updatedAt: z.string(),
  counts: z.object({ documents: z.number(), openBlockers: z.number() }),
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const SourceViewSchema = z.object({
  id: z.string(),
  kind: z.enum(['text', 'markdown', 'chat_export', 'pdf', 'docx', 'figma']),
  title: z.string(),
  originalName: z.string().nullable(),
  sizeBytes: z.number(),
  status: z.enum(['pending', 'parsed', 'failed']),
  error: z.string().nullable(),
  preview: z.string(),
  createdAt: z.string(),
});
export type SourceView = z.infer<typeof SourceViewSchema>;

export const FactSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  category: z.string(),
  statement: z.string(),
  quote: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
});
export type Fact = z.infer<typeof FactSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  key: z.string(),
  area: z.string(),
  prompt: z.string(),
  why: z.string(),
  options: z.array(z.string()),
  recommended: z.string().nullable(),
  status: z.enum(['open', 'answered', 'skipped']),
  answer: z.string().nullable(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const DecisionViewSchema = z.object({
  key: z.string(),
  area: z.string(),
  category: z.string(),
  priority: z.enum(['P0', 'P1']),
  value: z.string(),
  status: z.enum(['confirmed', 'assumed', 'deferred']),
  rationale: z.string(),
  version: z.number(),
});
export type DecisionView = z.infer<typeof DecisionViewSchema>;

export const RunSchema = z.object({
  id: z.string(),
  stage: z.enum(['process', 'analyze', 'generate', 'gate']),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  total: z.number(),
  done: z.number(),
  error: z.string().nullable(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
});
export type Run = z.infer<typeof RunSchema>;

export const GateFindingSchema = z.object({
  id: z.string(),
  rule: z.string(),
  severity: z.enum(['blocker', 'warning']),
  documentPath: z.string().nullable(),
  message: z.string(),
  status: z.enum(['open', 'accepted']),
  acceptReason: z.string().nullable(),
});
export type GateFinding = z.infer<typeof GateFindingSchema>;

export const DocumentListItemSchema = z.object({
  path: z.string(),
  title: z.string(),
  status: z.enum(['pending', 'generating', 'done', 'failed', 'stale']),
  writer: z.string(),
  updatedAt: z.string(),
});
export type DocumentListItem = z.infer<typeof DocumentListItemSchema>;

export const ProjectCountsSchema = z.object({
  sources: z.number(),
  facts: z.number(),
  openQuestions: z.number(),
  documents: z.number(),
  openBlockers: z.number(),
});
export type ProjectCounts = z.infer<typeof ProjectCountsSchema>;

export const ProjectViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: ProjectModeSchema,
  status: ProjectStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectView = z.infer<typeof ProjectViewSchema>;

export const AccessTokenItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AccessTokenItem = z.infer<typeof AccessTokenItemSchema>;

export const UsageSchema = z.object({
  tokensIn: z.number(),
  tokensOut: z.number(),
  costUsd: z.number(),
  byTag: z.record(z.object({ tokensIn: z.number(), tokensOut: z.number(), costUsd: z.number(), calls: z.number() })),
});
export type Usage = z.infer<typeof UsageSchema>;
