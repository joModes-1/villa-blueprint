export const CHUNK_SIZE = 12_000;

function splitLong(paragraph: string, max: number): string[] {
  if (paragraph.length <= max) return [paragraph];
  const parts: string[] = [];
  for (let i = 0; i < paragraph.length; i += max) parts.push(paragraph.slice(i, i + max));
  return parts;
}

/**
 * Splits on blank lines into chunks of at most `max` characters, carrying the last paragraph of each chunk
 * into the next for context.
 */
export function chunkText(text: string, max: number = CHUNK_SIZE): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized === '') return [];
  if (normalized.length <= max) return [normalized];
  const paragraphs = normalized.split(/\n\s*\n/).flatMap((p) => splitLong(p, Math.floor(max / 2)));
  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const p of paragraphs) {
    const add = p.length + 2;
    if (size + add > max && current.length > 0) {
      chunks.push(current.join('\n\n'));
      const carry = current[current.length - 1] as string;
      current = [carry];
      size = carry.length + 2;
    }
    current.push(p);
    size += add;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks;
}
