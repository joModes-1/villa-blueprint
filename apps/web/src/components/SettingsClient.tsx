'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, KeyRound, Plug } from 'lucide-react';
import type { AccessTokenItem } from '@blueprint/core/src/api-types';
import { api, errorMessage } from '@/lib/api-client';
import { timeAgo } from '@/lib/labels';
import { Badge, Banner, Card, EmptyState, ErrorBanner, LoadingList } from './ui/display';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/fields';
import { useToast } from './ui/Toast';

export function claudeCodeCommand(url: string, token: string): string {
  return `claude mcp add --transport http villa-blueprint ${url} --header "Authorization: Bearer ${token}"`;
}

export function mcpJson(url: string, token: string): string {
  return JSON.stringify({ mcpServers: { 'villa-blueprint': { type: 'http', url, headers: { Authorization: `Bearer ${token}` } } } }, null, 2);
}

function Snippet({ title, note, text }: { title: string; note?: string; text: string }) {
  const { toast } = useToast();
  return (
    <Card as="section" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Plug className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="flex-1 text-lg">{title}</h3>
        <Button
          variant="secondary"
          icon={<Copy className="h-4 w-4" aria-hidden="true" />}
          aria-label={`Copy ${title}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              toast('Copied.', 'success');
            } catch {
              toast('Could not copy. Select the text and copy it manually.', 'danger');
            }
          }}
        >
          Copy
        </Button>
      </div>
      {note ? <p className="text-[13px] text-muted">{note}</p> : null}
      <pre className="overflow-x-auto rounded-control bg-ink p-4 font-mono text-[13px] text-white">{text}</pre>
    </Card>
  );
}

export function SettingsClient({ mcpUrl }: { mcpUrl: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<AccessTokenItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AccessTokenItem | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ items: AccessTokenItem[] }>('/tokens')).items);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (name.trim() === '') {
      setNameError('Name the token.');
      return;
    }
    setBusy(true);
    try {
      const out = await api<{ token: string }>('/tokens', { method: 'POST', body: { name } });
      setShown(out.token);
      setCreating(false);
      setName('');
      setNameError(undefined);
      await load();
    } catch (err) {
      setNameError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(): Promise<void> {
    if (!revoking) return;
    setBusy(true);
    try {
      await api(`/tokens/${revoking.id}`, { method: 'DELETE' });
      setRevoking(null);
      toast('Token revoked.', 'success');
      await load();
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setBusy(false);
    }
  }

  const tokenText = shown ?? '<your-token>';

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl">Connect your AI</h1>
        <p className="mt-1 text-muted">Create an access token, then connect Claude Code, Claude Desktop, Cursor or any MCP client.</p>
      </div>

      <section aria-labelledby="tokens-h" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 id="tokens-h" className="flex-1 text-xl">
            Access tokens
          </h2>
          <Button onClick={() => setCreating(true)} icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}>
            New token
          </Button>
        </div>
        {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}
        {!error && items === null ? <LoadingList rows={2} /> : null}
        {items && items.length === 0 ? <EmptyState title="Connect Claude, Cursor or any MCP client" text="Create a token to let your AI tools send sources in and pull the pack out." /> : null}
        {items && items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {items.map((t) => (
              <Card as="li" key={t.id} className="flex flex-wrap items-center gap-3 !p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.name}</p>
                  <p className="font-mono text-[13px] text-muted">{t.prefix}…</p>
                </div>
                <Badge>Created {timeAgo(t.createdAt)}</Badge>
                <Badge tone={t.lastUsedAt ? 'success' : 'neutral'}>{t.lastUsedAt ? `Used ${timeAgo(t.lastUsedAt)}` : 'Never used'}</Badge>
                <Button variant="danger" onClick={() => setRevoking(t)} aria-label={`Revoke ${t.name}`}>
                  Revoke
                </Button>
              </Card>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="connect-h" className="flex flex-col gap-4">
        <h2 id="connect-h" className="text-xl">
          Connect
        </h2>
        {shown ? <Banner tone="warning">Your new token is filled into the snippets below. It disappears when you leave this page.</Banner> : null}
        <Snippet title="Claude Code" text={claudeCodeCommand(mcpUrl, tokenText)} />
        <Snippet title="Cursor and other MCP clients (mcp.json)" note="Each client keeps its config in a different place; the JSON shape is the same." text={mcpJson(mcpUrl, tokenText)} />
        <p className="text-muted">Then just ask Claude: “send this chat to my Blueprint project”.</p>
      </section>

      <Dialog open={creating} onClose={() => setCreating(false)} title="New access token">
        <form onSubmit={create} className="flex flex-col gap-4">
          <Input label="Name" value={name} error={nameError} maxLength={60} placeholder="Claude Code on my laptop" onChange={(e) => setName(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Create token
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={shown !== null} onClose={() => setShown(null)} title="Your new token">
        <p className="mb-3 font-semibold text-danger-ink">You won’t see this again.</p>
        <p data-testid="token-value" className="break-all rounded-control bg-ink p-3 font-mono text-[13px] text-white">
          {shown}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            icon={<Copy className="h-4 w-4" aria-hidden="true" />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shown ?? '');
                toast('Copied.', 'success');
              } catch {
                toast('Could not copy. Select the token and copy it manually.', 'danger');
              }
            }}
          >
            Copy token
          </Button>
          <Button onClick={() => setShown(null)}>Done</Button>
        </div>
      </Dialog>

      <Dialog open={revoking !== null} onClose={() => setRevoking(null)} title="Revoke this token?">
        <p className="mb-4 text-muted">Any tool using “{revoking?.name}” stops working immediately.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRevoking(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void revoke()}>
            Revoke token
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
