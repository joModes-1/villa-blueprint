import JSZip from 'jszip';
import { projectSlug } from './slug';
import { isExportPath, PACK_SPEC } from './spec';

export interface ZipDoc {
  path: string;
  content: string;
}

/** The export zip: `<slug>/…`, never `internal/`, ordered by PACK_SPEC and then the task files. */
export async function buildZip(projectName: string, docs: ZipDoc[]): Promise<Uint8Array> {
  const slug = projectSlug(projectName);
  const order = new Map(PACK_SPEC.map((s, i) => [s.path, i]));
  const files = docs
    .filter((d) => isExportPath(d.path))
    .sort((a, b) => (order.get(a.path) ?? 100_000) - (order.get(b.path) ?? 100_000) || a.path.localeCompare(b.path));
  const zip = new JSZip();
  for (const f of files) zip.file(`${slug}/${f.path}`, f.content, { date: new Date('2026-01-01T00:00:00Z'), createFolders: false });
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
