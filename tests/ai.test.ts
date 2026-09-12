import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propose } from '../server/ai';
import { createTemplate } from '../shared/template';
test('provider proposals are validated; refusal, invalid paths, and failures never apply', async () => {
  const originalFetch = globalThis.fetch,
    oldKey = process.env.OPENAI_API_KEY,
    oldModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = 'test-key-not-real';
  process.env.OPENAI_MODEL = 'test-model';
  const game = createTemplate();
  const result = (value: unknown) =>
    new Response(JSON.stringify(value), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      assert.equal(body.tools, undefined);
      return result({
        status: 'completed',
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  summary: 'A sunset',
                  changes: [{ path: 'levels.0.theme', value: 'sunset' }],
                }),
              },
            ],
          },
        ],
      });
    };
    assert.equal((await propose(game, 'make a sunset')).changes[0].value, 'sunset');
    assert.equal(game.levels[0].theme, 'meadow');
    for (const response of [
      { status: 'incomplete', output: [] },
      { status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No' }] }] },
      {
        status: 'completed',
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  summary: 'unsafe',
                  changes: [{ path: '__proto__.hacked', value: true }],
                }),
              },
            ],
          },
        ],
      },
    ]) {
      globalThis.fetch = async () => result(response);
      await assert.rejects(propose(game, 'test proposal'), (e: any) => e.status === 502);
    }
    globalThis.fetch = async () => new Response('{}', { status: 429 });
    await assert.rejects(propose(game, 'test'), (e: any) => e.status === 502);
    globalThis.fetch = async () => {
      throw new DOMException('Timeout', 'TimeoutError');
    };
    await assert.rejects(propose(game, 'test'), (e: any) => e.status === 504);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey) process.env.OPENAI_API_KEY = oldKey;
    else delete process.env.OPENAI_API_KEY;
    if (oldModel) process.env.OPENAI_MODEL = oldModel;
    else delete process.env.OPENAI_MODEL;
  }
});
