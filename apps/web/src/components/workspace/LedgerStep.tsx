'use client';

import { useEffect, useState } from 'react';
import type { DecisionView } from '@blueprint/core/src/api-types';
import { api, errorMessage } from '@/lib/api-client';
import { useResource } from '@/lib/use-resource';
import { Badge, ErrorBanner, LoadingList } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/fields';
import { useToast } from '@/components/ui/Toast';

export function isRequiredEmpty(d: Pick<DecisionView, 'priority' | 'value'>): boolean {
  return d.priority === 'P0' && d.value.trim() === '';
}

function Row({ d, projectId, locked, onSaved }: { d: DecisionView; projectId: string; locked: boolean; onSaved: (stale: string[]) => Promise<void> }) {
  const [value, setValue] = useState(d.value);
  const [status, setStatus] = useState<DecisionView['status']>(d.status);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  useEffect(() => {
    setValue(d.value);
    setStatus(d.status);
  }, [d.value, d.status, d.version]);
  const dirty = value !== d.value || status !== d.status;
  const required = isRequiredEmpty({ priority: d.priority, value });

  async function save(): Promise<void> {
    setBusy(true);
    try {
      const out = await api<{ staleDocuments: string[] }>(`/projects/${projectId}/decisions/${d.key}`, { method: 'PATCH', body: { value, status } });
      await onSaved(out.staleDocuments);
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li id={`decision-${d.key}`} data-testid={`row-${d.key}`} className={`rounded-control border p-3 ${required ? 'border-l-4 border-danger border-l-danger bg-danger-soft/40' : 'border-border bg-white'}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="font-display text-base">{d.area}</h4>
        <Badge tone={d.priority === 'P0' ? 'primary' : 'neutral'}>{d.priority}</Badge>
        {required ? <Badge tone="danger">Required</Badge> : null}
        <span className="ml-auto text-[13px] text-muted">{d.rationale}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_170px_auto] md:items-end">
        <Textarea label={`${d.area} value`} hideLabel rows={2} value={value} disabled={locked} onChange={(e) => setValue(e.target.value)} maxLength={2000} />
        <Select label={`${d.area} status`} hideLabel value={status} disabled={locked} onChange={(e) => setStatus(e.target.value as DecisionView['status'])}>
          <option value="confirmed">Confirmed</option>
          <option value="assumed">Assumed</option>
          <option value="deferred">Deferred</option>
        </Select>
        <Button loading={busy} disabled={locked || !dirty} onClick={() => void save()}>
          Save
        </Button>
      </div>
    </li>
  );
}

export function LedgerStep({ projectId, locked, onChanged, focusKey }: { projectId: string; locked: boolean; onChanged: () => Promise<void>; focusKey?: string }) {
  const res = useResource<{ items: DecisionView[] }>(`/projects/${projectId}/decisions`);
  const { toast } = useToast();

  useEffect(() => {
    if (focusKey && res.data) document.getElementById(`decision-${focusKey}`)?.scrollIntoView({ block: 'center' });
  }, [focusKey, res.data]);

  if (res.error) return <ErrorBanner message={res.error} onRetry={() => void res.reload()} />;
  if (res.loading && !res.data) return <LoadingList />;
  const items = res.data?.items ?? [];

  const groups = new Map<string, DecisionView[]>();
  for (const d of items) groups.set(d.category, [...(groups.get(d.category) ?? []), d]);
  const missing = items.filter(isRequiredEmpty).length;

  async function saved(stale: string[]): Promise<void> {
    if (stale.length > 0) toast(`${stale.length} documents are now out of date: ${stale.slice(0, 4).join(', ')}${stale.length > 4 ? '…' : ''}`, 'info');
    else toast('Saved.', 'success');
    await res.reload();
    await onChanged();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">The ledger is the single source of truth. Every document follows it. {missing > 0 ? `${missing} required decisions still need a value.` : 'Every required decision has a value.'}</p>
      {[...groups.entries()].map(([category, list]) => (
        <section key={category} aria-labelledby={`cat-${category}`}>
          <h3 id={`cat-${category}`} className="mb-2 text-lg capitalize">
            {category}
          </h3>
          <ul className="flex flex-col gap-3">
            {list.map((d) => (
              <Row key={d.key} d={d} projectId={projectId} locked={locked} onSaved={saved} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
