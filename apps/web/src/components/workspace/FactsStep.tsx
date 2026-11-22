'use client';

import type { Fact, SourceView } from '@blueprint/core/src/api-types';
import { useResource } from '@/lib/use-resource';
import { EmptyState, ErrorBanner, LoadingList } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';

const DOT = { high: 'bg-success', medium: 'bg-amber', low: 'bg-danger' } as const;

export function FactsStep({ projectId, onNext }: { projectId: string; onNext: () => void }) {
  const facts = useResource<{ items: Fact[] }>(`/projects/${projectId}/facts`);
  const sources = useResource<{ items: SourceView[] }>(`/projects/${projectId}/sources`);
  const titles = new Map((sources.data?.items ?? []).map((s) => [s.id, s.title]));

  if (facts.error) return <ErrorBanner message={facts.error} onRetry={() => void facts.reload()} />;
  if (facts.loading && !facts.data) return <LoadingList />;
  const items = facts.data?.items ?? [];
  if (items.length === 0) return <EmptyState title="No facts yet" text="Add sources and press Analyze. Blueprint will list what it understood here." />;

  const groups = new Map<string, Fact[]>();
  for (const f of items) groups.set(f.category, [...(groups.get(f.category) ?? []), f]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">
        {items.length} facts understood from your sources. Each one carries the exact words it came from.
      </p>
      {[...groups.entries()].map(([category, list]) => (
        <details key={category} open className="rounded-card border border-border bg-white p-4 shadow-card">
          <summary className="cursor-pointer font-display text-lg font-bold capitalize">
            {category} <span className="text-sm font-medium text-muted">({list.length})</span>
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {list.map((f) => (
              <li key={f.id} className="slide-in">
                <p className="flex items-start gap-2 font-medium">
                  <span className={`mt-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT[f.confidence]}`} aria-hidden="true" />
                  <span>
                    {f.statement} <span className="text-[13px] font-normal text-muted">({f.confidence} confidence)</span>
                  </span>
                </p>
                <blockquote className="ml-4 mt-1 border-l-4 border-primary/30 pl-3 text-[13px] text-muted">“{f.quote}”</blockquote>
                <p className="ml-4 mt-1 text-[13px] text-muted">From {titles.get(f.sourceId) ?? 'a source'}</p>
              </li>
            ))}
          </ul>
        </details>
      ))}
      <div>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}
