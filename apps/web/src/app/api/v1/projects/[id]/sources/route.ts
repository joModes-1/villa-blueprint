import { prisma } from '@blueprint/db';
import { PayloadTooLargeError, SOURCE_LIMITS, ValidationError } from '@blueprint/core';
import { handle, json } from '@/server/http';
import { requireUser } from '@/server/auth';
import { loadOwnedProject } from '@/server/projects';
import { addFigmaSource, addFileSource, addTextSource, jsonSourceSchema, listSources } from '@/server/sources';

export const dynamic = 'force-dynamic';

// Multipart framing adds a little to the file itself.
const MAX_BODY_BYTES = SOURCE_LIMITS.maxFileBytes + 512 * 1024;

export const GET = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  return json({ items: await listSources(prisma, project) });
});

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(prisma, req);
  const project = await loadOwnedProject(prisma, params.id as string, user.id);
  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.toLowerCase().startsWith('multipart/form-data')) {
    const length = Number(req.headers.get('content-length') ?? 0);
    if (length > MAX_BODY_BYTES) throw new PayloadTooLargeError();
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new ValidationError('A file is required.', [{ field: 'file', message: 'Choose a file to upload.' }]);
    }
    const title = form.get('title');
    const source = await addFileSource(prisma, project, file, typeof title === 'string' ? title : undefined);
    return json({ source }, 201);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON or multipart form data.');
  }
  const input = jsonSourceSchema.parse(body);
  const source =
    input.kind === 'figma'
      ? await addFigmaSource(prisma, project, input)
      : await addTextSource(prisma, project, input);
  return json({ source }, 201);
});
