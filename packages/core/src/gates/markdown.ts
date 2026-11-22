function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

const isSeparator = (line: string): boolean => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line.trim());

export function stripCodeBlocks(md: string): string {
  return md.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '');
}

/** Rows of every markdown table as cell arrays, excluding each table's header row and its `---` separator. */
export function parseTables(md: string): string[][] {
  const lines = stripCodeBlocks(md).split('\n');
  const rows: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (!line.trim().startsWith('|')) continue;
    if (isSeparator(line)) continue;
    const next = lines[i + 1];
    if (next !== undefined && next.trim().startsWith('|') && isSeparator(next)) continue; // header row
    rows.push(splitRow(line));
  }
  return rows;
}

/** Lower-case, no leading numbering ("1."), no trailing punctuation, single spaces. */
export function normHeading(text: string): string {
  return text
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/[*_`:.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** True when the document has a "## <heading>" line. Case, trailing colons and ### level are tolerated. */
export function hasHeading(md: string, heading: string): boolean {
  const want = normHeading(heading);
  return md.split('\n').some((l) => {
    const m = /^#{2,3}\s+(.*)$/.exec(l.trim());
    return !!m && normHeading(m[1] ?? '') === want;
  });
}

/** The text between `## <heading>` and the next `## ` heading ('' when the heading is absent). */
export function findSection(md: string, heading: string): string {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return '';
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if ((lines[i] as string).startsWith('## ')) break;
    out.push(lines[i] as string);
  }
  return out.join('\n');
}
