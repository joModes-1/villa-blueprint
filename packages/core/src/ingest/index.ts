import { parseChatExport } from './chatExport';
import { normalizeText } from './text';

export type ParsedKind = 'text' | 'markdown' | 'chat_export' | 'pdf' | 'docx' | 'figma';

export interface ParsedSource {
  text: string;
  meta: { truncated?: boolean; conversations?: number; pages?: number };
}

/**
 * docs/27 "Parse to plain text". Binary kinds come as `raw`; text kinds and the already-fetched Figma text
 * come as `text`. Throws on a corrupt file. The PDF and DOCX libraries are loaded on demand so that
 * importing core stays cheap for the web process.
 */
export async function parseSource(
  kind: ParsedKind,
  input: { raw?: Buffer | null; text?: string | null },
): Promise<ParsedSource> {
  if (kind === 'figma') return { text: input.text ?? '', meta: {} };
  if (kind === 'text' || kind === 'markdown') {
    const text = input.text ?? (input.raw ? input.raw.toString('utf8') : '');
    return { text: normalizeText(text), meta: {} };
  }
  if (!input.raw) {
    if (input.text != null) return { text: normalizeText(input.text), meta: {} };
    throw new Error('The uploaded file is empty.');
  }
  if (kind === 'chat_export') {
    const { text, conversations } = parseChatExport(input.raw);
    return { text, meta: { conversations } };
  }
  if (kind === 'pdf') {
    const { parsePdf } = await import('./pdf');
    const { text, pages } = await parsePdf(input.raw);
    return { text, meta: { pages } };
  }
  const { parseDocx } = await import('./docx');
  const { text } = await parseDocx(input.raw);
  return { text, meta: {} };
}

export { parseChatExport, normalizeText };
