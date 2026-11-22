export interface Requirement {
  id: string;
  /** The requirement wording from the table row (or the line), without the ID and pipes. */
  text: string;
  deferred: boolean;
}

const rank = (line: string, id: string): number => {
  const t = line.trim();
  if (t.startsWith('|') && new RegExp(`^\\|\\s*${id}\\s*\\|`).test(t)) return 3; // a table row that starts with the ID
  if (new RegExp(`^[-*]?\\s*\\**${id}\\**\\s*[:.\\-–—]`).test(t)) return 2; // "- FR-003: …"
  return 1; // the ID is only mentioned in prose
};

/**
 * Requirements of one kind found in a document. The best line that carries an ID wins (a table row beats a
 * bullet, which beats a sentence that merely mentions it); a requirement is deferred when that line says
 * so ("Deferred", "Post-MVP", "Out of scope").
 */
export function extractRequirements(markdown: string, prefix: 'FR' | 'NFR'): Requirement[] {
  const re = new RegExp(`\\b${prefix}-\\d{3}\\b`, 'g');
  const best = new Map<string, { line: string; rank: number }>();
  for (const line of markdown.split('\n')) {
    for (const id of new Set(line.match(re) ?? [])) {
      const r = rank(line, id);
      const cur = best.get(id);
      if (!cur || r > cur.rank) best.set(id, { line, rank: r });
    }
  }
  const out: Requirement[] = [];
  for (const [id, { line, rank: r }] of best) {
    const text = line
      .replace(/^\s*[-*]\s*/, '')
      .split('|')
      .map((c) => c.replace(id, '').replace(/^[\s:.)-]+/, '').trim())
      .filter((c) => c !== '')
      .join(' — ')
      .replace(/\s+/g, ' ')
      .slice(0, 220);
    out.push({ id, text, deferred: r > 1 && /\b(deferred|post-mvp|out of scope)\b/i.test(line) });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
