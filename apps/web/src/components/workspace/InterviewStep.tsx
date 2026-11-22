'use client';

import { useState } from 'react';
import type { Question } from '@blueprint/core/src/api-types';
import { api, errorMessage } from '@/lib/api-client';
import { useResource } from '@/lib/use-resource';
import { Badge, Card, EmptyState, ErrorBanner, LoadingList } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/fields';
import { useToast } from '@/components/ui/Toast';

function QuestionCard({ q, projectId, disabled, onDone }: { q: Question; projectId: string; disabled: boolean; onDone: () => Promise<void> }) {
  const [choice, setChoice] = useState<string>(q.recommended ?? '');
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState<'save' | 'skip' | null>(null);
  const { toast } = useToast();
  const answer = other.trim() !== '' ? other.trim() : choice;

  async function act(kind: 'save' | 'skip'): Promise<void> {
    setBusy(kind);
    try {
      await api(`/projects/${projectId}/questions/${q.id}/${kind === 'save' ? 'answer' : 'skip'}`, { method: 'POST', body: kind === 'save' ? { answer } : undefined });
      await onDone();
    } catch (err) {
      toast(errorMessage(err), 'danger');
      setBusy(null);
    }
  }

  return (
    <Card as="li" className="slide-in flex flex-col gap-3">
      <div>
        <h3 className="text-lg">{q.prompt}</h3>
        <p className="text-sm text-muted">Why this matters: {q.why}</p>
        <p className="text-[13px] text-muted">{q.area}</p>
      </div>
      {q.options.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Options for {q.area}</legend>
          {q.options.map((o) => (
            <label key={o} className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-control border p-3 ${choice === o && other.trim() === '' ? 'border-primary bg-primary-soft' : 'border-border'}`}>
              <input type="radio" name={`q-${q.id}`} className="mt-1" checked={choice === o} onChange={() => { setChoice(o); setOther(''); }} />
              <span className="flex-1">{o}</span>
              {o === q.recommended ? <span className="brand-gradient rounded-full px-2 py-0.5 text-xs font-semibold text-white">Recommended</span> : null}
            </label>
          ))}
        </fieldset>
      ) : null}
      <Input label={q.options.length ? 'Other…' : 'Your answer'} value={other} onChange={(e) => setOther(e.target.value)} maxLength={2000} />
      <div className="flex gap-2">
        <Button loading={busy === 'save'} disabled={disabled || busy !== null || answer === ''} onClick={() => void act('save')}>
          Save
        </Button>
        <Button variant="ghost" loading={busy === 'skip'} disabled={disabled || busy !== null} onClick={() => void act('skip')}>
          Skip
        </Button>
      </div>
    </Card>
  );
}

export function InterviewStep({ projectId, locked, onChanged }: { projectId: string; locked: boolean; onChanged: () => Promise<void> }) {
  const res = useResource<{ items: Question[] }>(`/projects/${projectId}/questions`);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function refresh(): Promise<void> {
    await res.reload();
    await onChanged();
  }

  async function acceptAll(): Promise<void> {
    setBusy(true);
    try {
      const out = await api<{ answered: number }>(`/projects/${projectId}/questions/accept-recommended`, { method: 'POST' });
      toast(`Accepted ${out.answered} recommended answers.`, 'success');
      await refresh();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setBusy(false);
    }
  }

  if (res.error) return <ErrorBanner message={res.error} onRetry={() => void res.reload()} />;
  if (res.loading && !res.data) return <LoadingList />;
  const all = res.data?.items ?? [];
  const open = all.filter((q) => q.status === 'open');
  const closed = all.filter((q) => q.status !== 'open');
  if (all.length === 0) return <EmptyState title="No questions" text="Analyze your sources first; Blueprint then asks only what it cannot read from them." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-card border border-border bg-white/95 p-3 shadow-card backdrop-blur">
        <p className="flex-1 font-semibold">{open.length === 0 ? 'All questions are done.' : `${open.length} ${open.length === 1 ? 'question' : 'questions'} left`}</p>
        <Button loading={busy} disabled={locked || open.length === 0} onClick={() => void acceptAll()}>
          Accept all recommended
        </Button>
      </div>
      {open.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {open.map((q) => (
            <QuestionCard key={q.id} q={q} projectId={projectId} disabled={locked} onDone={refresh} />
          ))}
        </ul>
      ) : null}
      {closed.length > 0 ? (
        <details className="rounded-card border border-border bg-white p-4">
          <summary className="cursor-pointer font-semibold">Answered and skipped ({closed.length})</summary>
          <ul className="mt-3 flex flex-col gap-2">
            {closed.map((q) => (
              <li key={q.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                <Badge tone={q.status === 'answered' ? 'success' : 'neutral'}>{q.status}</Badge>
                <span className="font-medium">{q.area}</span>
                <span className="text-muted">{q.answer ?? '—'}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
