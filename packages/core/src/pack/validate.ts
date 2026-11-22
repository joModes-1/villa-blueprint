import { hasHeading } from '../gates/markdown';

/** Strips a wrapping ```markdown fence, if present. */
export function stripMarkdownFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:markdown|md)?[ \t]*\n([\s\S]*?)\n?```$/i.exec(t);
  return (m?.[1] ?? t).trim();
}

export interface DocValidation {
  ok: boolean;
  missing: string[];
  content: string;
}

/** The output must start with "# " and contain every required "## " heading (docs/27). */
export function validateDoc(raw: string, headings: string[] = []): DocValidation {
  const content = stripMarkdownFence(raw);
  const missing: string[] = [];
  if (!content.startsWith('# ')) missing.push('# <title>');
  for (const h of headings) {
    if (!hasHeading(content, h)) missing.push(`## ${h}`);
  }
  return { ok: missing.length === 0, missing, content };
}
