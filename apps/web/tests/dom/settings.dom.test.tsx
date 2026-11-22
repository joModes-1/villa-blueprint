// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsClient, claudeCodeCommand, mcpJson } from '@/components/SettingsClient';
import { mockFetch } from './helpers';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const TOKEN = 'bp_SECRET_TOKEN_VALUE';

describe('Settings', () => {
  it('shows the empty state, creates a token, shows it once, and hides it on close', async () => {
    let created = false;
    mockFetch({
      'GET /tokens': () => ({ body: { items: created ? [{ id: 't1', name: 'Laptop', prefix: 'bp_SECRET_', lastUsedAt: null, createdAt: new Date().toISOString() }] : [] } }),
      'POST /tokens': () => {
        created = true;
        return { status: 201, body: { token: TOKEN, item: {} } };
      },
    });
    render(<SettingsClient mcpUrl="http://localhost:3102/mcp" />);
    expect(await screen.findByText('Connect Claude, Cursor or any MCP client')).toBeTruthy();
    expect(screen.getAllByText(/<your-token>/, { selector: 'pre' })).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'New token' }));
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Laptop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create token' }));

    expect((await screen.findByTestId('token-value')).textContent).toBe(TOKEN);
    expect(screen.getByText('You won’t see this again.')).toBeTruthy();
    expect(screen.getAllByText(new RegExp(TOKEN), { selector: 'pre' })).toHaveLength(2); // snippets are filled in

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByTestId('token-value')).toBeNull());
    expect(screen.queryByText(new RegExp(TOKEN))).toBeNull();
    expect(await screen.findByText('Laptop')).toBeTruthy();
    expect(screen.getByText('bp_SECRET_…')).toBeTruthy();
  });

  it('revokes with a confirmation', async () => {
    let revoked = false;
    const { calls } = mockFetch({
      'GET /tokens': () => ({ body: { items: revoked ? [] : [{ id: 't1', name: 'Laptop', prefix: 'bp_abcdefg', lastUsedAt: null, createdAt: new Date().toISOString() }] } }),
      'DELETE /tokens/t1': () => {
        revoked = true;
        return { status: 204 };
      },
    });
    render(<SettingsClient mcpUrl="http://x/mcp" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke Laptop' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke token' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
    expect(await screen.findByText('Connect Claude, Cursor or any MCP client')).toBeTruthy();
  });

  it('renders the connect snippets from docs/31', () => {
    expect(claudeCodeCommand('http://h/mcp', 'bp_x')).toBe('claude mcp add --transport http villa-blueprint http://h/mcp --header "Authorization: Bearer bp_x"');
    expect(JSON.parse(mcpJson('http://h/mcp', 'bp_x'))).toEqual({ mcpServers: { 'villa-blueprint': { type: 'http', url: 'http://h/mcp', headers: { Authorization: 'Bearer bp_x' } } } });
  });

  it('shows an error with Retry when the list cannot load', async () => {
    mockFetch({ 'GET /tokens': () => ({ status: 500, body: { error: { code: 'INTERNAL', message: 'Down' } } }) });
    render(<SettingsClient mcpUrl="http://x/mcp" />);
    expect((await screen.findByRole('alert')).textContent).toContain('Down');
  });
});
