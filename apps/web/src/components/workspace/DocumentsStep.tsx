'use client';

import { useEffect, useState } from 'react';
import { Copy, FileText } from 'lucide-react';
import type { DocumentListItem } from '@blueprint/core/src/api-types';
import { useResource } from '@/lib/use-resource';
import { Card, EmptyState, ErrorBanner, LoadingList } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MarkdownView } from './MarkdownView';

export function folderOf(path: string): string {
  if (path.startsWith('docs/build/tasks/')) return 'Tasks';
  if (path.startsWith('docs/build/')) return 'docs/build';
  if (path.startsWith('docs/')) return 'docs';
  return 'Start here';
}

const FOLDER_ORDER = ['Start here', 'docs', 'docs/build', 'Tasks'];

export function DocumentsStep({ projectId, initialPath, running }: { projectId: string; initialPath?: string; running: boolean }) {
  const list = useResource<{ items: DocumentListItem[] }>(`/projects/${projectId}/documents`, running);
  const [path, setPath] = useState<string | undefined>(initialPath);
  const content = useResource<{ path: string; title: string; content: string; status: string }>(
    path ? `/projects/${projectId}/documents/content?path=${encodeURIComponent(path)}` : null,
  );
  const { toast } = useToast();

  useEffect(() => {
    if (initialPath) setPath(initialPath);
  }, [initialPath]);

  const items = (list.data?.items ?? []).filter((d) => d.status === 'done');
  useEffect(() => {
    if (!path && items.length > 0) setPath(items.find((d) => d.path === 'docs/00-index.md')?.path ?? items[0]?.path);
  }, [items, path]);

  if (list.error) return <ErrorBanner message={list.error} onRetry={() => void list.reload()} />;
  if (list.loading && !list.data) return <LoadingList />;
  if (items.length === 0) return <EmptyState title="No documents yet" text="Generate the pack and its documents appear here as they finish." icon={<FileText className="h-8 w-8 text-primary" aria-hidden="true" />} />;

  const groups = new Map<string, DocumentListItem[]>();
  for (const d of items) groups.set(folderOf(d.path), [...(groups.get(folderOf(d.path)) ?? []), d]);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(content.data?.content ?? '');
      toast('Copied.', 'success');
    } catch {
      toast('Could not copy. Select the text and copy it manually.', 'danger');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <nav aria-label="Documents" className="flex flex-col gap-4">
        {FOLDER_ORDER.filter((f) => groups.has(f)).map((folder) => (
          <div key={folder}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{folder}</p>
            <ul className="flex flex-col gap-1">
              {(groups.get(folder) ?? []).map((d) => (
                <li key={d.path}>
                  <button
                    type="button"
                    aria-current={d.path === path ? 'true' : undefined}
                    onClick={() => setPath(d.path)}
                    className={`min-h-[40px] w-full rounded-control px-3 py-1.5 text-left text-sm ${d.path === path ? 'bg-primary-soft font-semibold text-primary-hover' : 'hover:bg-primary-soft'}`}
                  >
                    <span className="block truncate font-mono text-[13px]">{d.path.split('/').pop()}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <Card as="section" className="min-w-0">
        {content.error ? <ErrorBanner message={content.error} onRetry={() => void content.reload()} /> : null}
        {content.loading && !content.data ? <LoadingList rows={4} /> : null}
        {content.data ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <p className="flex-1 truncate font-mono text-[13px] text-muted">{content.data.path}</p>
              <Button variant="secondary" icon={<Copy className="h-4 w-4" aria-hidden="true" />} onClick={() => void copy()}>
                Copy
              </Button>
            </div>
            <MarkdownView content={content.data.content} />
          </>
        ) : null}
      </Card>
    </div>
  );
}
