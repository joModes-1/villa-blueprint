/** Lower-cased project name with non-alphanumerics replaced by `-`, at most 50 characters. */
export function projectSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  return slug || 'blueprint';
}

export function taskFileName(n: number, slug: string): string {
  return `task-${String(n).padStart(3, '0')}-${slug}.md`;
}
