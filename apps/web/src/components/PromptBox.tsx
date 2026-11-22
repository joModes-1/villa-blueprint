'use client';

import { useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ArrowUp, FileText, MessageSquare, Palette, Paperclip, X } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { ACCEPT, fileProblem, startProject, type StartInput } from '@/lib/start-project';
import { formatBytes } from '@/lib/labels';
import { Spinner } from '@/components/ui/Spinner';
import { Banner } from '@/components/ui/display';

const SUGGESTIONS = ['A booking app for salons', 'A marketplace for local farmers', 'An AI tutor for kids'];

export function PromptBox({ onStarted }: { onStarted: (projectId: string) => void }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [figma, setFigma] = useState<StartInput['figma']>(null);
  const [figmaOpen, setFigmaOpen] = useState(false);
  const [figmaDraft, setFigmaDraft] = useState({ url: '', token: '' });
  const [mode, setMode] = useState<StartInput['mode']>('founder');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = 26;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, line * 3), line * 12)}px`;
  }, [text]);

  function addFiles(list: FileList | File[]): void {
    const next: File[] = [];
    for (const f of Array.from(list)) {
      const problem = fileProblem(f);
      if (problem) {
        setError(problem);
        continue;
      }
      next.push(f);
    }
    if (next.length) setFiles((cur) => [...cur, ...next]);
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  const canSend = !busy && (text.trim() !== '' || files.length > 0 || figma !== null);

  async function send(): Promise<void> {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      onStarted(await startProject({ text, files, figma, mode }));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px]">
      {error ? (
        <div className="mb-3">
          <Banner tone="danger">{error}</Banner>
        </div>
      ) : null}
      <div
        className="gradient-border relative rounded-prompt p-4 shadow-prompt"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {drag ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-prompt border-2 border-dashed border-primary bg-white/90 font-semibold text-primary">
            Drop files here
          </div>
        ) : null}

        {files.length > 0 || figma ? (
          <ul className="mb-3 flex flex-wrap gap-2" aria-label="Attachments">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[13px] font-medium">
                {f.name.endsWith('.json') ? <MessageSquare className="h-4 w-4" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                {f.name} <span className="text-muted">{formatBytes(f.size)}</span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
            {figma ? (
              <li className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[13px] font-medium">
                <Palette className="h-4 w-4" aria-hidden="true" /> Figma link
                <button type="button" aria-label="Remove Figma link" onClick={() => setFigma(null)}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}

        <label htmlFor="idea" className="sr-only">
          Describe your app idea
        </label>
        <textarea
          id="idea"
          ref={area}
          value={text}
          rows={3}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send();
          }}
          placeholder="Describe your app idea, or paste a whole ChatGPT / Claude conversation…"
          className="w-full resize-none border-0 bg-transparent text-base leading-[26px] text-ink placeholder:text-muted focus:outline-none"
          style={{ outline: 'none' }}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={picker}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            aria-label="Attach files"
            tabIndex={-1}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button type="button" onClick={() => picker.current?.click()} className="inline-flex min-h-[44px] items-center gap-2 rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft">
            <Paperclip className="h-4 w-4" aria-hidden="true" /> Attach
          </button>
          <div className="relative">
            <button type="button" aria-expanded={figmaOpen} onClick={() => setFigmaOpen((o) => !o)} className="inline-flex min-h-[44px] items-center gap-2 rounded-control px-3 text-sm font-semibold text-primary hover:bg-primary-soft">
              <Palette className="h-4 w-4" aria-hidden="true" /> Figma
            </button>
            {figmaOpen ? (
              <div role="group" aria-label="Figma file" className="absolute left-0 top-12 z-20 flex w-[min(86vw,340px)] flex-col gap-2 rounded-card border border-border bg-white p-4 shadow-prompt">
                <label className="text-[13px] font-medium" htmlFor="figma-url">
                  Figma file link
                </label>
                <input id="figma-url" value={figmaDraft.url} onChange={(e) => setFigmaDraft({ ...figmaDraft, url: e.target.value })} placeholder="https://www.figma.com/design/…" className="rounded-control border border-primary/25 px-3 py-2 text-sm" />
                <label className="text-[13px] font-medium" htmlFor="figma-token">
                  Personal access token
                </label>
                <input id="figma-token" type="password" autoComplete="off" value={figmaDraft.token} onChange={(e) => setFigmaDraft({ ...figmaDraft, token: e.target.value })} className="rounded-control border border-primary/25 px-3 py-2 text-sm" />
                <p className="text-[13px] text-muted">Your token is used once and never stored.</p>
                <button
                  type="button"
                  disabled={!figmaDraft.url.trim() || !figmaDraft.token.trim()}
                  onClick={() => {
                    setFigma({ url: figmaDraft.url.trim(), token: figmaDraft.token });
                    setFigmaDraft({ url: '', token: '' });
                    setFigmaOpen(false);
                  }}
                  className="btn-gradient min-h-[44px] rounded-control px-3 text-sm font-semibold disabled:opacity-50"
                >
                  Add Figma file
                </button>
              </div>
            ) : null}
          </div>

          <div role="radiogroup" aria-label="Mode" title="Founder asks fewer questions" className="ml-1 inline-flex rounded-full bg-primary-soft p-1 text-sm font-semibold">
            {(['founder', 'expert'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`min-h-[36px] rounded-full px-3 capitalize ${mode === m ? 'bg-white text-primary shadow' : 'text-muted'}`}>
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            aria-label="Build my blueprint"
            className="btn-gradient ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 font-semibold shadow-card disabled:opacity-50"
          >
            {busy ? <Spinner className="h-5 w-5" /> : <ArrowUp className="h-5 w-5" aria-hidden="true" />}
            <span className="hidden sm:inline">Build my blueprint</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setText(s);
              area.current?.focus();
            }}
            className="min-h-[44px] rounded-full border border-primary/25 bg-white px-4 text-sm font-medium text-ink hover:bg-primary-soft"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
