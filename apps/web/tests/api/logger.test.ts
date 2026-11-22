import { describe, expect, it } from 'vitest';
import { createLogger } from '@/server/logger';

describe('logger redaction (NFR-011)', () => {
  it('redacts password, token, cookie, authorization and api keys', () => {
    const lines: string[] = [];
    const log = createLogger({ write: (s: string) => void lines.push(s) });
    log.info(
      {
        password: 'p1',
        token: 't1',
        cookie: 'c1',
        apiKey: 'k1',
        OPENROUTER_API_KEY: 'k2',
        headers: { cookie: 'c2', authorization: 'Bearer bp_x' },
        nested: { token: 't2', password: 'p2' },
      },
      'hello',
    );
    const out = lines.join('');
    for (const secret of ['p1', 't1', 'c1', 'k1', 'k2', 'c2', 'bp_x', 't2', 'p2']) {
      expect(out).not.toContain(`"${secret}"`);
      expect(out).not.toContain(`Bearer ${secret}`);
    }
    expect(out).toContain('[Redacted]');
  });
});
