import mammoth from 'mammoth';
import { normalizeText } from './text';

export async function parseDocx(buf: Buffer): Promise<{ text: string }> {
  const out = await mammoth.extractRawText({ buffer: buf });
  return { text: normalizeText(out.value).trim() };
}
