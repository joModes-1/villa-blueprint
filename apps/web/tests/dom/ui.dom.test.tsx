// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api, ApiError, fieldErrors } from '@/lib/api-client';
import { AuthForm, safeNext, validateAuth } from '@/components/AuthForm';
import { InterviewStep } from '@/components/workspace/InterviewStep';
import { LedgerStep, isRequiredEmpty } from '@/components/workspace/LedgerStep';
import { GatesStep, exportBlockReason } from '@/components/workspace/GatesStep';
import { currentStep, stepEnabled } from '@/components/workspace/steps';
import { deriveName, fileProblem } from '@/lib/start-project';
import { mockFetch } from './helpers';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('next=/projects/abc'),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('api-client', () => {
  it('throws ApiError with code, message and details', async () => {
    mockFetch({ 'POST /x': () => ({ status: 400, body: { error: { code: 'VALIDATION_ERROR', message: 'bad', details: [{ field: 'email', message: 'Nope' }] } } }) });
    const err = await api('/x', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'VALIDATION_ERROR', status: 400, message: 'bad' });
    expect(fieldErrors(err)).toEqual({ email: 'Nope' });
  });

  it('redirects to /login?next=… on a 401 UNAUTHENTICATED', async () => {
    const assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { pathname: '/projects/1', search: '?a=1', assign }, writable: true });
    mockFetch({ 'GET /me': () => ({ status: 401, body: { error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } } }) });
    await expect(api('/me')).rejects.toMatchObject({ status: 401 });
    expect(assign).toHaveBeenCalledWith('/login?next=%2Fprojects%2F1%3Fa%3D1');
  });

  it('maps a network failure to a readable error and returns undefined on 204', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(api('/x')).rejects.toMatchObject({ code: 'NETWORK' });
    mockFetch({ 'DELETE /x': () => ({ status: 204 }) });
    expect(await api('/x', { method: 'DELETE' })).toBeUndefined();
  });
});

describe('auth form', () => {
  it('validates locally the way the API does', () => {
    expect(validateAuth('signup', { name: '', email: 'bad', password: 'short' })).toEqual({ name: 'Enter your name.', email: 'Enter a valid email address.', password: 'Use at least 10 characters.' });
    expect(validateAuth('login', { name: '', email: 'a@b.co', password: 'x' })).toEqual({});
    expect(safeNext('//evil.com')).toBe('/projects');
    expect(safeNext('/projects/1')).toBe('/projects/1');
  });

  it('renders the server error for invalid credentials and for rate limiting', async () => {
    mockFetch({ 'POST /auth/login': () => ({ status: 401, body: { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } } }) });
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Email or password is incorrect.');
    cleanup();
    mockFetch({ 'POST /auth/login': () => ({ status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' } } }) });
    render(<AuthForm mode="login" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Too many attempts');
  });

  it('shows inline field errors without calling the API', () => {
    const { calls } = mockFetch({});
    render(<AuthForm mode="signup" />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Enter your name.')).toBeTruthy();
    expect(screen.getByText('Use at least 10 characters.', { selector: 'p[role=alert]' })).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
});

const question = (id: string, status: 'open' | 'answered' = 'open') => ({
  id,
  key: `k${id}`,
  area: `Area ${id}`,
  prompt: `Question ${id}?`,
  why: 'because',
  options: ['Alpha', 'Beta'],
  recommended: 'Alpha',
  status,
  answer: status === 'answered' ? 'Beta' : null,
});

describe('InterviewStep', () => {
  it('"Accept all recommended" calls the endpoint and refreshes', async () => {
    let accepted = false;
    const { calls } = mockFetch({
      'GET /projects/p1/questions': () => ({ body: { items: accepted ? [question('1', 'answered'), question('2', 'answered')] : [question('1'), question('2')] } }),
      'POST /projects/p1/questions/accept-recommended': () => {
        accepted = true;
        return { body: { answered: 2, project: {} } };
      },
    });
    const onChanged = vi.fn(async () => undefined);
    render(<InterviewStep projectId="p1" locked={false} onChanged={onChanged} />);
    expect(await screen.findByText('2 questions left')).toBeTruthy();
    expect(screen.getAllByText('Recommended')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Accept all recommended' }));
    await waitFor(() => expect(screen.getByText('All questions are done.')).toBeTruthy());
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/accept-recommended'))).toBe(true);
    expect(onChanged).toHaveBeenCalled();
  });

  it('saving a card sends the chosen option, and Other wins over a radio', async () => {
    const { calls } = mockFetch({
      'GET /projects/p1/questions': () => ({ body: { items: [question('1')] } }),
      'POST /projects/p1/questions/1/answer': () => ({ body: {} }),
    });
    render(<InterviewStep projectId="p1" locked={false} onChanged={async () => undefined} />);
    await screen.findByText('Question 1?');
    fireEvent.click(screen.getByLabelText('Beta'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ answer: 'Beta' }));
  });

  it('shows an error banner with Retry when loading fails', async () => {
    mockFetch({ 'GET /projects/p1/questions': () => ({ status: 500, body: { error: { code: 'INTERNAL', message: 'Boom' } } }) });
    render(<InterviewStep projectId="p1" locked={false} onChanged={async () => undefined} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Boom');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});

describe('LedgerStep', () => {
  const dec = (key: string, priority: 'P0' | 'P1', value: string) => ({ key, area: `Area ${key}`, category: 'technical', priority, value, status: value ? 'confirmed' : 'deferred', rationale: '', version: 0 });

  it('shows an empty P0 row in red with "Required"', async () => {
    mockFetch({ 'GET /projects/p1/decisions': () => ({ body: { items: [dec('a', 'P0', ''), dec('b', 'P0', 'x'), dec('c', 'P1', '')] } }) });
    render(<LedgerStep projectId="p1" locked={false} onChanged={async () => undefined} />);
    const row = await screen.findByTestId('row-a');
    expect(row.className).toContain('border-danger');
    expect(row.textContent).toContain('Required');
    expect(screen.getByTestId('row-b').textContent).not.toContain('Required');
    expect(screen.getByTestId('row-c').textContent).not.toContain('Required');
    expect(isRequiredEmpty({ priority: 'P0', value: '  ' })).toBe(true);
  });

  it('saving a row patches the decision and reports stale documents', async () => {
    const { calls } = mockFetch({
      'GET /projects/p1/decisions': () => ({ body: { items: [dec('a', 'P0', 'old')] } }),
      'PATCH /projects/p1/decisions/a': () => ({ body: { staleDocuments: ['docs/07.md'] } }),
    });
    render(<LedgerStep projectId="p1" locked={false} onChanged={async () => undefined} />);
    const box = (await screen.findByLabelText('Area a value')) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ value: 'new', status: 'confirmed' }));
  });
});

describe('GatesStep', () => {
  const project = (status: 'ready' | 'blocked') => ({ id: 'p1', name: 'P', mode: 'founder' as const, status, createdAt: '', updatedAt: '' });
  const blocker = { id: 'f1', rule: 'G11', severity: 'blocker', documentPath: 'docs/08.md', message: 'Conflict', status: 'open', acceptReason: null };
  const routes = (items: unknown[]) => ({
    'GET /projects/p1/findings': () => ({ body: { items } }),
    'GET /projects/p1/usage': () => ({ body: { tokensIn: 100, tokensOut: 50, costUsd: 0.5, byTag: {} } }),
  });

  it('Download is disabled, with the reason, while a blocker is open', async () => {
    mockFetch(routes([blocker]));
    render(<GatesStep projectId="p1" project={project('blocked')} onChanged={async () => undefined} onOpenDoc={() => undefined} />);
    const btn = (await screen.findByRole('button', { name: /Download pack/ })) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText('1 issue must be fixed or accepted first.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Download pack/ })).toBeNull();
    expect(await screen.findByText(/150 tokens/)).toBeTruthy();
  });

  it('Download is a plain link to /export when the project is ready', async () => {
    mockFetch(routes([]));
    render(<GatesStep projectId="p1" project={project('ready')} onChanged={async () => undefined} onOpenDoc={() => undefined} />);
    const link = (await screen.findByRole('link', { name: /Download pack/ })) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/api/v1/projects/p1/export');
    expect(screen.getByText('All 11 quality checks passed ✓')).toBeTruthy();
  });

  it('exportBlockReason follows the status and findings', () => {
    expect(exportBlockReason('ready', [])).toBeNull();
    expect(exportBlockReason('generating', [])).toBe('The checks have not finished yet.');
    expect(exportBlockReason('blocked', [{ ...blocker, status: 'accepted' } as never])).toBeNull();
  });
});

describe('workspace helpers', () => {
  const p = (status: string) => ({ id: 'p', name: 'n', mode: 'founder', status, createdAt: '', updatedAt: '' }) as never;
  const counts = { sources: 1, facts: 0, openQuestions: 0, documents: 0, openBlockers: 0 };

  it('derives the current step from the status', () => {
    expect(currentStep(p('draft'), null)).toBe('sources');
    expect(currentStep(p('interviewing'), null)).toBe('interview');
    expect(currentStep(p('generating'), null)).toBe('generate');
    expect(currentStep(p('blocked'), null)).toBe('gates');
  });

  it('enables steps only when their data exists', () => {
    expect(stepEnabled('sources', p('draft'), counts)).toBe(true);
    expect(stepEnabled('facts', p('draft'), counts)).toBe(false);
    expect(stepEnabled('interview', p('interviewing'), counts)).toBe(true);
    expect(stepEnabled('documents', p('ready'), { ...counts, documents: 3 })).toBe(true);
    expect(stepEnabled('gates', p('generating'), counts)).toBe(false);
    expect(stepEnabled('gates', p('ready'), counts)).toBe(true);
  });

  it('names a project and checks files before upload', () => {
    expect(deriveName('A booking app for salons and spas in town\nmore', [], null)).toBe('A booking app for salons and');
    expect(deriveName('', [new File(['x'], 'notes.pdf')], null)).toBe('notes');
    expect(deriveName('', [], { url: 'u', token: 't' })).toBe('Figma project');
    expect(fileProblem(new File(['x'], 'a.png'))).toContain('use .md');
    expect(fileProblem(new File([new Uint8Array(11 * 1024 * 1024)], 'a.pdf'))).toContain('10 MB');
    expect(fileProblem(new File(['x'], 'a.md'))).toBeNull();
  });
});
