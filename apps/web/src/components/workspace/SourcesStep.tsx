'use client';

import { useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { FileText, MessageSquare, Palette, Trash2, UploadCloud } from 'lucide-react';
import type { SourceView } from '@blueprint/core/src/api-types';
import { api, errorMessage } from '@/lib/api-client';
import { useResource } from '@/lib/use-resource';
import { ACCEPT, fileProblem } from '@/lib/start-project';
import { formatBytes } from '@/lib/labels';
import { Badge, Card, EmptyState, ErrorBanner, LoadingList } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/fields';
import { useToast } from '@/components/ui/Toast';

const KIND_ICON = { chat_export: MessageSquare, figma: Palette } as const;

export function SourcesStep({
  projectId,
  editable,
  locked,
  onChanged,
}: {
  projectId: string;
  editable: boolean;
  locked: boolean;
  onChanged: () => Promise<void>;
}) {
  const res = useResource<{ items: SourceView[] }>(`/projects/${projectId}/sources`, locked);
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [figma, setFigma] = useState({ url: '', token: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const items = res.data?.items ?? [];

  async function run(key: string, fn: () => Promise<void>, ok?: string): Promise<void> {
    setBusy(key);
    try {
      await fn();
      if (ok) toast(ok, 'success');
      await res.reload();
      await onChanged();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setBusy(null);
    }
  }

  async function upload(files: FileList | File[]): Promise<void> {
    for (const f of Array.from(files)) {
      const problem = fileProblem(f);
      if (problem) {
        toast(problem, 'danger');
        continue;
      }
      await run('upload', async () => {
        const form = new FormData();
        form.set('file', f);
        await api(`/projects/${projectId}/sources`, { method: 'POST', form });
      }, `${f.name} added.`);
    }
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    setDrag(false);
    if (editable && e.dataTransfer.files.length) void upload(e.dataTransfer.files);
  }

  async function addText(e: FormEvent): Promise<void> {
    e.preventDefault();
    await run('text', async () => {
      await api(`/projects/${projectId}/sources`, { method: 'POST', body: { kind: 'text', title: title.trim() || 'Pasted text', text } });
      setTitle('');
      setText('');
    }, 'Text added.');
  }

  async function addFigma(e: FormEvent): Promise<void> {
    e.preventDefault();
    await run('figma', async () => {
      await api(`/projects/${projectId}/sources`, { method: 'POST', body: { kind: 'figma', url: figma.url.trim(), token: figma.token } });
      setFigma({ url: '', token: '' });
    }, 'Figma file added.');
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="src-list">
        <h2 id="src-list" className="mb-3 text-xl">
          Your sources
        </h2>
        {res.error ? <ErrorBanner message={res.error} onRetry={() => void res.reload()} /> : null}
        {res.loading && !res.data ? <LoadingList rows={2} /> : null}
        {res.data && items.length === 0 ? <EmptyState title="No sources yet" text="Paste your idea, drop a file or add a Figma link below." /> : null}
        {items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {items.map((s) => {
              const Icon = KIND_ICON[s.kind as keyof typeof KIND_ICON] ?? FileText;
              return (
                <Card as="li" key={s.id} className="flex items-center gap-3 !p-3">
                  <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.title}</p>
                    <p className="text-[13px] text-muted">
                      {s.kind.replace('_', ' ')} · {formatBytes(s.sizeBytes)}
                    </p>
                    {s.error ? <p className="text-[13px] text-danger-ink">{s.error}</p> : null}
                  </div>
                  <Badge tone={s.status === 'parsed' ? 'success' : s.status === 'failed' ? 'danger' : 'neutral'}>{s.status}</Badge>
                  {editable ? (
                    <button type="button" aria-label={`Delete ${s.title}`} disabled={busy !== null} onClick={() => void run('del', () => api(`/projects/${projectId}/sources/${s.id}`, { method: 'DELETE' }))} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger-ink">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </Card>
              );
            })}
          </ul>
        ) : null}
      </section>

      {editable ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card as="section" className="flex flex-col gap-3">
            <h3 className="text-lg">Paste text</h3>
            <form onSubmit={addText} className="flex flex-col gap-3">
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My idea" maxLength={120} />
              <Textarea label="Text" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a brainstorm, notes or a whole chat…" />
              <Button type="submit" loading={busy === 'text'} disabled={text.trim() === ''}>
                Add text
              </Button>
            </form>
          </Card>

          <div className="flex flex-col gap-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center gap-2 rounded-card border-2 border-dashed p-6 text-center ${drag ? 'border-primary bg-primary-soft' : 'border-primary/30 bg-white'}`}
            >
              <UploadCloud className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="font-semibold">Drop files here</p>
              <p className="text-[13px] text-muted">.md .txt .json .pdf .docx · up to 10 MB</p>
              <input ref={picker} type="file" multiple accept={ACCEPT} aria-label="Choose files" className="sr-only" onChange={(e) => { if (e.target.files) void upload(e.target.files); e.target.value = ''; }} />
              <Button variant="secondary" loading={busy === 'upload'} onClick={() => picker.current?.click()}>
                Choose files
              </Button>
            </div>

            <Card as="section">
              <h3 className="mb-3 text-lg">Figma file</h3>
              <form onSubmit={addFigma} className="flex flex-col gap-3">
                <Input label="Figma file link" value={figma.url} onChange={(e) => setFigma({ ...figma, url: e.target.value })} placeholder="https://www.figma.com/design/…" />
                <Input label="Personal access token" type="password" autoComplete="off" value={figma.token} onChange={(e) => setFigma({ ...figma, token: e.target.value })} hint="Token is used once and never stored." />
                <Button type="submit" variant="secondary" loading={busy === 'figma'} disabled={!figma.url.trim() || !figma.token}>
                  Add Figma file
                </Button>
              </form>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
