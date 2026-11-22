import { describe, expect, it } from 'vitest';
import { answerProblem, extractRequirements, FactsResponse, selectFacts, type PromptFact, findVendorMentions, g12UnapprovedVendors, neutralizeVendors, unapprovedVendors, type LedgerRow } from '../src';

const ledger = (rows: Record<string, string>): LedgerRow[] =>
  Object.entries(rows).map(([key, value]) => ({ key, value, status: 'confirmed' as const }));

const own = ledger({ 'auth.method': 'Email/password with first-party JWT', 'integrations.email': 'Not needed in first version' });

describe('vendor neutrality', () => {
  it('bans vendors the ledger does not name, and allows those it does', () => {
    const names = (l: LedgerRow[]) => unapprovedVendors(l).map((v) => v.name);
    expect(names(own)).toContain('Clerk');
    expect(names(own)).toContain('Stripe');
    const chosen = ledger({ 'auth.method': 'Clerk', 'integrations.payments': 'Stripe' });
    expect(names(chosen)).not.toContain('Clerk');
    expect(names(chosen)).not.toContain('Stripe');
    expect(names(chosen)).toContain('Resend');
  });

  it('neutralizes guide text: vendor names become generic, vendor env vars disappear', () => {
    const text = ['Clerk handles sign-in.', 'CLERK_SECRET_KEY=   # Clerk backend secret', 'Use Stripe webhooks.', 'Plain line.'].join('\n');
    const out = neutralizeVendors(text, own);
    expect(out).not.toMatch(/clerk|stripe/i);
    expect(out).toContain('the authentication approach in the ledger handles sign-in.');
    expect(out).toContain('Plain line.');
    expect(neutralizeVendors(text, ledger({ 'auth.method': 'Clerk', 'integrations.payments': 'Stripe' }))).toBe(text);
  });

  it('does not treat a job role called clerk or the word "resend" as a vendor', () => {
    const banned = unapprovedVendors(own);
    expect(findVendorMentions('A clerk registers patients.\nResend the verification link.', banned)).toEqual([]);
    expect(findVendorMentions('Clerk can register patients.', banned)).toEqual([]);
  });

  it('finds real mentions, skipping code blocks and rejected alternatives', () => {
    const banned = unapprovedVendors(own);
    const md = ['AuthGuard (Clerk token verification)', '| Auth0 | Rejected alternative |', '```', 'STRIPE_KEY=x', '```', 'Resend API sends mail'].join('\n');
    expect(findVendorMentions(md, banned).map((h) => h.vendor.name).sort()).toEqual(['Clerk', 'Resend']);
  });

  it('G12 blocks a doc that names an unapproved vendor', () => {
    const docs = new Map([['docs/07-system-architecture.md', '## Auth\nAuthGuard (Clerk token verification)']]);
    const f = g12UnapprovedVendors({ docs, ledger: own, questions: [], plan: { tasks: [] } });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ rule: 'G12', severity: 'blocker', documentPath: 'docs/07-system-architecture.md' });
    expect(f[0]!.message).toContain('Clerk');
    expect(g12UnapprovedVendors({ docs, ledger: ledger({ 'auth.method': 'Clerk' }), questions: [], plan: { tasks: [] } })).toEqual([]);
  });
});

describe('facts response', () => {
  it('accepts more than 60 facts and drops only the invalid ones', () => {
    const good = (i: number) => ({ category: 'scope', statement: `Fact ${i}`, quote: `quote ${i}`, confidence: 'high' });
    const facts = [...Array.from({ length: 80 }, (_, i) => good(i)), { category: 'nonsense', statement: 'x', quote: 'y', confidence: 'high' }, { category: 'scope', statement: 'ok ok', quote: 'q'.repeat(400), confidence: 'low' }];
    const parsed = FactsResponse.parse({ facts });
    expect(parsed.facts).toHaveLength(80);
    expect(() => FactsResponse.parse({ facts: 'nope' })).toThrow();
  });
});

describe('analyze fact selection', () => {
  it('shares the cap between sources instead of cutting the last one', () => {
    const mk = (src: string, i: number): PromptFact => ({ id: `${src}-${i}`, category: 'scope', statement: 'x'.repeat(50), confidence: 'high', sourceId: src });
    const facts = [...Array.from({ length: 30 }, (_, i) => mk('a', i)), ...Array.from({ length: 30 }, (_, i) => mk('b', i))];
    const picked = selectFacts(facts, 20 * 70); // room for about 20 facts
    const fromB = picked.filter((f) => f.sourceId === 'b').length;
    expect(picked.length).toBeGreaterThan(10);
    expect(Math.abs(fromB - (picked.length - fromB))).toBeLessThanOrEqual(1);
  });

  it('still takes high confidence before low across sources', () => {
    const low: PromptFact = { id: 'l', category: 'scope', statement: 'low one', confidence: 'low', sourceId: 'a' };
    const high: PromptFact = { id: 'h', category: 'scope', statement: 'high one', confidence: 'high', sourceId: 'b' };
    expect(selectFacts([low, high], 1000).map((f) => f.id)).toEqual(['h', 'l']);
  });
});

describe('answers and requirements', () => {
  it('rejects answers that point elsewhere or hand the decision back', () => {
    for (const bad of ['all needed as in docs i described', 'you can create jobs or roles accding to product thats on you', 'up to you', 'tbd', 'ok', 'see the attached brief']) {
      expect(answerProblem(bad), bad).not.toBeNull();
    }
    for (const good of ['Receptionist, nurse, doctor, lab technician, pharmacist, clinic admin', 'Admin (full access), Editor, Viewer']) {
      expect(answerProblem(good), good).toBeNull();
    }
  });

  it('extracts requirement wording and the deferred flag', () => {
    const srs = ['| ID | Requirement | Priority |', '| FR-001 | Register a patient | P0 |', '| FR-002 | Send SMS reminders (Deferred) | P2 |', '- FR-003: Book an appointment'].join('\n');
    const r = extractRequirements(srs, 'FR');
    expect(r.map((x) => x.id)).toEqual(['FR-001', 'FR-002', 'FR-003']);
    expect(r[0]).toMatchObject({ text: 'Register a patient — P0', deferred: false });
    expect(r[1]!.deferred).toBe(true);
    expect(r[2]!.text).toContain('Book an appointment');
  });

  it('prefers the table row over an intro sentence that only mentions the ID', () => {
    const srs = ['Functional IDs (FR-001 … FR-002) are inherited. FR-002 is deferred in this note.', '| FR-001 | Capture a decision | P0 |', '| FR-002 | Export data | P1 |'].join('\n');
    const r = extractRequirements(srs, 'FR');
    expect(r[0]).toMatchObject({ id: 'FR-001', text: 'Capture a decision — P0', deferred: false });
    expect(r[1]).toMatchObject({ id: 'FR-002', text: 'Export data — P1', deferred: false });
  });
});
