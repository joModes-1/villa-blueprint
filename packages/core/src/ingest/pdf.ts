// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./pdf-parse.d.ts" />
// Import the library file, not the package root: the root runs a debug block that reads a test PDF
// and crashes outside its own repository (docs/08, trap 1).
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { normalizeText } from './text';

export async function parsePdf(buf: Buffer): Promise<{ text: string; pages: number }> {
  // The bundled pdf.js reads `buffer.buffer` and ignores `byteOffset`, so a Buffer that is a slice of a
  // larger ArrayBuffer (pooled allocations, database and socket reads) is parsed as garbage. Copy it first.
  const fresh = Buffer.alloc(buf.length);
  buf.copy(fresh);
  const out = await pdfParse(fresh);
  return { text: normalizeText(out.text ?? '').trim(), pages: out.numpages ?? 0 };
}
