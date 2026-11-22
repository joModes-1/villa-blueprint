import { UnprocessableError } from '../errors';

export const FIGMA_MAX_CHARS = 60_000;
const FIGMA_TIMEOUT_MS = 30_000;

export class FigmaError extends UnprocessableError {}

interface FigmaNode {
  type?: string;
  name?: string;
  characters?: string;
  children?: FigmaNode[];
}

interface FigmaFileResponse {
  name?: string;
  document?: FigmaNode;
  styles?: Record<string, { name?: string }>;
}

/** Parses the file key from figma.com/design/<key>/… or figma.com/file/<key>/… */
export function parseFigmaKey(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new FigmaError('FIGMA_URL_INVALID', 'Enter a Figma file link, for example https://www.figma.com/design/<key>/<name>.');
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== 'figma.com' && !host.endsWith('.figma.com')) {
    throw new FigmaError('FIGMA_URL_INVALID', 'That is not a figma.com link.');
  }
  const m = /^\/(?:design|file)\/([A-Za-z0-9]+)/.exec(parsed.pathname);
  if (!m?.[1]) {
    throw new FigmaError('FIGMA_URL_INVALID', 'The link must look like figma.com/design/<key>/… or figma.com/file/<key>/….');
  }
  return m[1];
}

function collectTexts(node: FigmaNode, out: string[]): void {
  if (node.type === 'TEXT' && typeof node.characters === 'string') {
    const text = node.characters.trim();
    if (text) out.push(text.replace(/\s*\n\s*/g, ' '));
  }
  for (const child of node.children ?? []) collectTexts(child, out);
}

/** Renders the Figma file response as markdown (docs/27 "Figma"). */
export function figmaToMarkdown(file: FigmaFileResponse): string {
  const lines: string[] = [`# Figma: ${file.name ?? 'Untitled'}`];
  for (const page of file.document?.children ?? []) {
    if (page.type !== 'CANVAS') continue;
    lines.push('', `## Page: ${page.name ?? 'Untitled'}`);
    for (const frame of page.children ?? []) {
      if (frame.type !== 'FRAME') continue;
      lines.push('', `### Screen: ${frame.name ?? 'Untitled'}`);
      const texts: string[] = [];
      collectTexts(frame, texts);
      for (const t of texts) lines.push(`- ${t}`);
    }
  }
  lines.push('', '## Styles');
  for (const style of Object.values(file.styles ?? {})) {
    if (style.name) lines.push(`- ${style.name}`);
  }
  const text = lines.join('\n');
  return text.length > FIGMA_MAX_CHARS ? text.slice(0, FIGMA_MAX_CHARS) : text;
}

export interface FigmaResult {
  title: string;
  text: string;
}

/**
 * Fetches a Figma file and returns it as text. The token is used for this one request and never stored,
 * logged or put into an error message.
 */
export async function fetchFigma(url: string, token: string, fetchImpl: typeof fetch = fetch): Promise<FigmaResult> {
  const key = parseFigmaKey(url);
  if (!token.trim()) throw new FigmaError('FIGMA_TOKEN_INVALID', 'Enter a Figma personal access token.');
  let res: Response;
  try {
    res = await fetchImpl(`https://api.figma.com/v1/files/${key}?depth=4`, {
      headers: { 'X-Figma-Token': token },
      signal: AbortSignal.timeout(FIGMA_TIMEOUT_MS),
    });
  } catch {
    throw new FigmaError('FIGMA_FILE_NOT_FOUND', 'Figma did not answer in time. Try again.');
  }
  if (res.status === 403) throw new FigmaError('FIGMA_TOKEN_INVALID', 'Figma rejected the token. Check that it can read this file.');
  if (res.status === 404) throw new FigmaError('FIGMA_FILE_NOT_FOUND', 'Figma could not find that file.');
  if (!res.ok) throw new FigmaError('FIGMA_FILE_NOT_FOUND', `Figma returned an error (HTTP ${res.status}).`);
  const file = (await res.json()) as FigmaFileResponse;
  return { title: `Figma: ${file.name ?? 'Untitled'}`, text: figmaToMarkdown(file) };
}
