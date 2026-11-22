import { api } from './api-client';

export interface StartInput {
  text: string;
  files: File[];
  figma: { url: string; token: string } | null;
  mode: 'founder' | 'expert';
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPT = '.md,.txt,.json,.pdf,.docx';
const MAX_PASTE_CHARS = 200_000;

export function deriveName(text: string, files: File[], figma: StartInput['figma']): string {
  const firstLine = (text.trim().split('\n')[0] ?? '').split(/[.!?]/)[0]?.trim() ?? '';
  const words = firstLine.split(/\s+/).filter(Boolean).slice(0, 6).join(' ');
  const base = words || files[0]?.name.replace(/\.[^.]+$/, '') || (figma ? 'Figma project' : 'Untitled idea');
  return base.slice(0, 80);
}

export function fileProblem(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return `${file.name} is over 10 MB.`;
  if (!/\.(md|txt|json|pdf|docx)$/i.test(file.name)) return `${file.name}: use .md, .txt, .json, .pdf or .docx.`;
  return null;
}

/** Creates the project, adds every source, and starts Analyze in one go. Returns the project id. */
export async function startProject(input: StartInput): Promise<string> {
  const { project } = await api<{ project: { id: string } }>('/projects', {
    method: 'POST',
    body: { name: deriveName(input.text, input.files, input.figma), mode: input.mode },
  });
  const base = `/projects/${project.id}`;
  const text = input.text.trim();
  if (text) {
    if (text.length > MAX_PASTE_CHARS) {
      const form = new FormData();
      form.set('file', new File([text], 'idea.txt', { type: 'text/plain' }));
      form.set('title', 'Idea');
      await api(`${base}/sources`, { method: 'POST', form });
    } else {
      await api(`${base}/sources`, { method: 'POST', body: { kind: 'text', title: 'Idea', text } });
    }
  }
  for (const file of input.files) {
    const form = new FormData();
    form.set('file', file);
    await api(`${base}/sources`, { method: 'POST', form });
  }
  if (input.figma) {
    await api(`${base}/sources`, { method: 'POST', body: { kind: 'figma', url: input.figma.url, token: input.figma.token } });
  }
  await api(`${base}/analyze`, { method: 'POST' });
  return project.id;
}
