import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  assertBudget,
  BudgetExceededError,
  completeJson,
  createAiClient,
  createMockClient,
  createOpenRouterClient,
  stripFences,
  type AiCall,
  type AiClient,
  type AiResult,
} from '../src/ai';

const call: AiCall = { tag: 'test', model: 'fast', system: 's', user: 'u', json: true };

function scripted(texts: string[]): { ai: AiClient; calls: AiCall[] } {
  const calls: AiCall[] = [];
  let i = 0;
  const ai: AiClient = {
    async complete(c): Promise<AiResult> {
      calls.push(c);
      const text = texts[Math.min(i++, texts.length - 1)] ?? '';
      return { text, model: 'm', tokensIn: 1, tokensOut: 2, costUsd: 0.5 };
    },
  };
  return { ai, calls };
}

describe('completeJson', () => {
  const schema = z.object({ a: z.number() });

  it('parses fenced JSON', async () => {
    const { ai } = scripted(['```json\n{"a":1}\n```']);
    const { data } = await completeJson(ai, call, schema);
    expect(data.a).toBe(1);
  });

  it('retries exactly once on invalid JSON, appending the error, and sums usage', async () => {
    const { ai, calls } = scripted(['not json', '{"a":2}']);
    const { data, result } = await completeJson(ai, call, schema);
    expect(data.a).toBe(2);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.user).toContain('Your previous reply was not valid:');
    expect(calls[1]?.user).toContain('Return only the JSON.');
    expect(result.tokensOut).toBe(4);
    expect(result.costUsd).toBeCloseTo(1);
  });

  it('retries once on a schema failure, and throws after a second failure', async () => {
    const { ai, calls } = scripted(['{"a":"x"}', '{"a":"y"}']);
    await expect(completeJson(ai, call, schema)).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });

  it('stripFences leaves plain text alone', () => {
    expect(stripFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe('budget', () => {
  it('throws at the limit and passes below it', () => {
    expect(() => assertBudget(99, 100)).not.toThrow();
    expect(() => assertBudget(100, 100)).toThrow(BudgetExceededError);
    expect(() => assertBudget(5_000_000, 0)).not.toThrow(); // 0 = no limit
    try {
      assertBudget(5, 1);
    } catch (e) {
      expect((e as BudgetExceededError).code).toBe('BUDGET_EXCEEDED');
      expect((e as BudgetExceededError).status).toBe(422);
    }
  });
});

describe('openrouter client', () => {
  const okBody = (text: string, tokens = 40) =>
    JSON.stringify({
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: 10, completion_tokens: tokens, cost: 0.0123 },
    });
  const headers = { 'content-type': 'application/json' };
  const sleeps: number[] = [];
  const base = {
    apiKey: 'k',
    baseUrl: 'https://openrouter.test/api/v1',
    models: { reasoning: 'r-model', fast: 'f-model' },
    timeoutMs: 5000,
    sleep: async (ms: number) => void sleeps.push(ms),
  };

  it('reads the cost from usage.cost and sends the model, json mode and usage flag', async () => {
    let body: Record<string, unknown> = {};
    const client = createOpenRouterClient({
      ...base,
      fetchImpl: (async (_url: unknown, init?: RequestInit) => {
        body = JSON.parse(String(init?.body));
        return new Response(okBody('hello'), { status: 200, headers });
      }) as typeof fetch,
    });
    const res = await client.complete({ ...call, model: 'reasoning' });
    expect(res.text).toBe('hello');
    expect(res.costUsd).toBeCloseTo(0.0123);
    expect(res.tokensIn).toBe(10);
    expect(body.model).toBe('r-model');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.usage).toEqual({ include: true });
  });

  it('turns hidden thinking off only when the call asks, and passes the token cap', async () => {
    const bodies: Record<string, unknown>[] = [];
    const client = createOpenRouterClient({
      ...base,
      fetchImpl: (async (_url: unknown, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        return new Response(okBody('hello'), { status: 200, headers });
      }) as typeof fetch,
    });
    await client.complete({ ...call, model: 'fast', reasoning: false, maxTokens: 12_000 });
    await client.complete({ ...call, model: 'reasoning' });
    expect(bodies[0]?.reasoning).toEqual({ enabled: false });
    expect(bodies[0]?.max_tokens).toBe(12_000);
    expect(bodies[1]).not.toHaveProperty('reasoning');
    expect(bodies[1]).not.toHaveProperty('max_tokens');
  });

  it('retries a 429 and then succeeds, with backoff', async () => {
    sleeps.length = 0;
    let n = 0;
    const client = createOpenRouterClient({
      ...base,
      fetchImpl: (async () => {
        n += 1;
        if (n === 1) return new Response('{"error":{"message":"slow down"}}', { status: 429, headers });
        return new Response(okBody('fine'), { status: 200, headers });
      }) as typeof fetch,
    });
    const res = await client.complete(call);
    expect(res.text).toBe('fine');
    expect(n).toBe(2);
    expect(sleeps).toEqual([2000]);
  });

  it('retries an empty answer', async () => {
    let n = 0;
    const client = createOpenRouterClient({
      ...base,
      fetchImpl: (async () => {
        n += 1;
        return new Response(okBody(n === 1 ? '' : 'second'), { status: 200, headers });
      }) as typeof fetch,
    });
    expect((await client.complete(call)).text).toBe('second');
    expect(n).toBe(2);
  });

  it('treats a very short document as a failure, and gives up after 3 attempts', async () => {
    let n = 0;
    const client = createOpenRouterClient({
      ...base,
      fetchImpl: (async () => {
        n += 1;
        return new Response(okBody('# x', 3), { status: 200, headers });
      }) as typeof fetch,
    });
    await expect(client.complete({ ...call, tag: 'doc:docs/01.md' })).rejects.toThrow(/AI request failed/);
    expect(n).toBe(3);
  });

  it('does not retry a 400', async () => {
    let n = 0;
    const client = createOpenRouterClient({
      ...base,
      fetchImpl: (async () => {
        n += 1;
        return new Response('{"error":{"message":"bad"}}', { status: 400, headers });
      }) as typeof fetch,
    });
    await expect(client.complete(call)).rejects.toThrow(/HTTP 400/);
    expect(n).toBe(1);
  });

  it('honors the timeout', async () => {
    let n = 0;
    const client = createOpenRouterClient({
      ...base,
      timeoutMs: 30,
      fetchImpl: ((_url: unknown, init?: RequestInit) => {
        n += 1;
        return new Promise((_res, rej) => {
          init?.signal?.addEventListener('abort', () => rej(new Error('aborted')));
        });
      }) as typeof fetch,
    });
    await expect(client.complete(call)).rejects.toThrow(/AI request failed/);
    expect(n).toBe(3);
  });
});

describe('createAiClient', () => {
  it('returns the mock by default and validates openrouter config', async () => {
    const mock = createAiClient({ AI_PROVIDER: 'mock' });
    expect((await mock.complete({ ...call, tag: 'x' })).model).toBe('mock-fast');
    expect(() => createAiClient({ AI_PROVIDER: 'openrouter' })).toThrow(/OPENROUTER_API_KEY/);
    expect(() => createAiClient({ AI_PROVIDER: 'other' })).toThrow(/Unknown AI_PROVIDER/);
    expect(createAiClient({ AI_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'k' })).toBeDefined();
  });
});

describe('mock provider', () => {
  it('is deterministic', async () => {
    const mock = createMockClient();
    const c: AiCall = { tag: 'doc:docs/03-cleaned-srs.md', model: 'reasoning', system: 's', user: 'u' };
    expect(await mock.complete(c)).toEqual(await mock.complete(c));
  });

  it('extract returns at most 3 facts whose quotes are in the chunk', async () => {
    const mock = createMockClient();
    const chunk = 'I want a notes app. Users sign up with email. Notes can be shared. Extra sentence here.';
    const res = await mock.complete({
      tag: 'extract',
      model: 'fast',
      system: '',
      user: `CATEGORIES: x\nSOURCE (Idea, part 1 of 1):\n${chunk}`,
      json: true,
    });
    const facts = JSON.parse(res.text).facts as { quote: string; category: string }[];
    expect(facts).toHaveLength(3);
    for (const f of facts) expect(chunk).toContain(f.quote);
    expect(facts.map((f) => f.category)).toEqual(['business', 'users', 'scope']);
    expect(res.costUsd).toBe(0);
  });

  it('analyze decides product.one_liner and asks for the other P0 keys', async () => {
    const mock = createMockClient();
    const res = await mock.complete({
      tag: 'analyze',
      model: 'reasoning',
      system: '',
      user: 'MODE: founder\nFACTS (id | category | statement):\nf1 | business | A notes app for teams\nReturn {}',
      json: true,
    });
    const out = JSON.parse(res.text);
    expect(out.decisions).toEqual([{ key: 'product.one_liner', value: 'A notes app for teams', factIds: ['f1'] }]);
    expect(out.questions.length).toBeGreaterThan(10);
    expect(out.questions.every((q: { options: string[]; recommended: string }) => q.options[0] === q.recommended)).toBe(true);
  });

  it('task-plan has 8 tasks with FR-001 on 4 and FR-002 on 6', async () => {
    const mock = createMockClient();
    const res = await mock.complete({ tag: 'task-plan', model: 'reasoning', system: '', user: '', json: true });
    const plan = JSON.parse(res.text);
    expect(plan.tasks).toHaveLength(8);
    expect(plan.tasks[3].requirementIds).toEqual(['FR-001']);
    expect(plan.tasks[5].requirementIds).toEqual(['FR-002', 'NFR-001', 'NFR-002']);
  });

  it('contradictions reports only when the marker is present', async () => {
    const mock = createMockClient();
    const clean = await mock.complete({ tag: 'contradictions', model: 'reasoning', system: '', user: '### a.md\nfine', json: true });
    expect(JSON.parse(clean.text).findings).toEqual([]);
    const bad = await mock.complete({
      tag: 'contradictions',
      model: 'reasoning',
      system: '',
      user: '### a.md\nfine\n### docs/b.md\nauth is Clerk MOCK_CONTRADICTION',
      json: true,
    });
    const f = JSON.parse(bad.text).findings;
    expect(f).toHaveLength(1);
    expect(f[0].documentPath).toBe('docs/b.md');
  });

  it('docs start with a title, carry every required heading and pass the length floor', async () => {
    const mock = createMockClient();
    const res = await mock.complete({ tag: 'doc:docs/10-api-specification.md', model: 'reasoning', system: '', user: '' });
    expect(res.text.startsWith('# API Specification')).toBe(true);
    for (const h of ['API Design Principles', 'Endpoints', 'Error Format']) expect(res.text).toContain(`## ${h}`);
    expect(res.text).toContain('| GET | /api/v1/projects | List projects | authenticated |');
    expect(res.text.length).toBeGreaterThan(400);
    expect(res.text).not.toMatch(/https?:\/\//);
    const ctx = await mock.complete({ tag: 'doc:docs/build/PROJECT_CONTEXT.md', model: 'fast', system: '', user: '' });
    expect(ctx.text.length).toBeGreaterThan(400);
  });
});
