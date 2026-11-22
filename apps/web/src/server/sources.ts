import type { PrismaClient, Project, Source, SourceKind } from '@blueprint/db';
import {
  fetchFigma,
  InvalidStateError,
  NotFoundError,
  PayloadTooLargeError,
  SOURCE_EDIT_STATUSES,
  SOURCE_LIMITS,
  UnprocessableError,
  ValidationError,
  type SourceView,
} from '@blueprint/core';
import { z } from 'zod';

export const textSourceSchema = z.object({
  kind: z.enum(['text', 'markdown']),
  title: z.string().trim().min(1).max(120),
  text: z.string().min(1).max(SOURCE_LIMITS.maxTextChars),
});
export const figmaSourceSchema = z.object({
  kind: z.literal('figma'),
  url: z.string().trim().min(1).max(500),
  token: z.string().min(1).max(500),
});
export const jsonSourceSchema = z.discriminatedUnion('kind', [textSourceSchema, figmaSourceSchema]);

const EXTENSIONS: Record<string, SourceKind> = {
  '.md': 'markdown',
  '.txt': 'text',
  '.json': 'chat_export',
  '.pdf': 'pdf',
  '.docx': 'docx',
};

export function inferKind(fileName: string): SourceKind {
  const dot = fileName.lastIndexOf('.');
  const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
  const kind = EXTENSIONS[ext];
  if (!kind) {
    throw new ValidationError('Unsupported file type.', [
      { field: 'file', message: 'Unsupported file type. Use .md, .txt, .json, .pdf or .docx.' },
    ]);
  }
  return kind;
}

export function toSourceView(s: Pick<Source, 'id' | 'kind' | 'title' | 'originalName' | 'sizeBytes' | 'status' | 'error' | 'text' | 'createdAt'>): SourceView {
  return {
    id: s.id,
    kind: s.kind,
    title: s.title,
    originalName: s.originalName,
    sizeBytes: s.sizeBytes,
    status: s.status,
    error: s.error,
    preview: (s.text ?? '').slice(0, 500),
    createdAt: s.createdAt.toISOString(),
  };
}

async function assertCanAdd(prisma: PrismaClient, project: Project): Promise<void> {
  if (!SOURCE_EDIT_STATUSES.includes(project.status)) {
    throw new InvalidStateError(`Sources cannot change while the project is "${project.status}".`);
  }
  const count = await prisma.source.count({ where: { projectId: project.id } });
  if (count >= SOURCE_LIMITS.maxSources) {
    throw new UnprocessableError('SOURCE_LIMIT', `A project can have at most ${SOURCE_LIMITS.maxSources} sources.`);
  }
}

export async function listSources(prisma: PrismaClient, project: Project): Promise<SourceView[]> {
  const rows = await prisma.source.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, kind: true, title: true, originalName: true, sizeBytes: true, status: true, error: true, text: true, createdAt: true },
  });
  return rows.map(toSourceView);
}

export async function addTextSource(
  prisma: PrismaClient,
  project: Project,
  input: z.infer<typeof textSourceSchema>,
): Promise<SourceView> {
  await assertCanAdd(prisma, project);
  const text = input.text.replace(/\r\n/g, '\n');
  const row = await prisma.source.create({
    data: {
      projectId: project.id,
      kind: input.kind,
      title: input.title,
      sizeBytes: Buffer.byteLength(text),
      text,
      status: 'pending',
    },
  });
  return toSourceView(row);
}

export async function addFileSource(
  prisma: PrismaClient,
  project: Project,
  file: File,
  title?: string,
): Promise<SourceView> {
  await assertCanAdd(prisma, project);
  const kind = inferKind(file.name);
  if (file.size > SOURCE_LIMITS.maxFileBytes) throw new PayloadTooLargeError();
  const bytes = Buffer.from(await file.arrayBuffer());
  const isPlain = kind === 'text' || kind === 'markdown';
  const row = await prisma.source.create({
    data: {
      projectId: project.id,
      kind,
      title: (title ?? '').trim() || file.name,
      originalName: file.name,
      mimeType: file.type || null,
      sizeBytes: bytes.length,
      status: 'pending',
      ...(isPlain ? { text: bytes.toString('utf8').replace(/\r\n/g, '\n') } : { raw: bytes }),
    },
  });
  return toSourceView(row);
}

/** The token is used for this one fetch and then dropped: it is never stored, queued or logged. */
export async function addFigmaSource(
  prisma: PrismaClient,
  project: Project,
  input: z.infer<typeof figmaSourceSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<SourceView> {
  await assertCanAdd(prisma, project);
  const { title, text } = await fetchFigma(input.url, input.token, fetchImpl);
  const row = await prisma.source.create({
    data: {
      projectId: project.id,
      kind: 'figma',
      title,
      url: input.url.trim(),
      sizeBytes: Buffer.byteLength(text),
      text,
      raw: null,
      status: 'pending',
    },
  });
  return toSourceView(row);
}

export async function deleteSource(prisma: PrismaClient, project: Project, sourceId: string): Promise<void> {
  if (!SOURCE_EDIT_STATUSES.includes(project.status)) {
    throw new InvalidStateError(`Sources cannot change while the project is "${project.status}".`);
  }
  const source = await prisma.source.findFirst({ where: { id: sourceId, projectId: project.id }, select: { id: true } });
  if (!source) throw new NotFoundError('Source not found.');
  await prisma.source.delete({ where: { id: source.id } });
}
