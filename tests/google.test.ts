import { test } from 'node:test';
import assert from 'node:assert/strict';
import { googleFlow } from '../server/google';
test('Google flow binds callback to browser, consumes state once, and checks verified profile', async () => {
  const flow = googleFlow();
  let cookie = '';
  const res: any = {
    cookie: (_: string, value: string) => {
      cookie = value;
    },
    clearCookie: () => {},
  };
  const url = new URL(flow.start(res, 'hashed-password', true));
  assert.equal(url.searchParams.get('state'), cookie);
  await assert.rejects(
    flow.finish(
      { query: { state: cookie, code: 'code' }, cookies: { google_state: 'wrong' } } as any,
      res,
    ),
    /expired/,
  );
  await assert.rejects(
    flow.finish(
      { query: { state: cookie, code: 'code' }, cookies: { google_state: cookie } } as any,
      res,
    ),
    /expired/,
  );
  flow.start(res, 'hashed-password', true);
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string) =>
    new Response(
      JSON.stringify(
        url.includes('/token')
          ? { access_token: 'test' }
          : { sub: 'google-id', email: 'USER@example.com', email_verified: true, name: 'Creator' },
      ),
    )) as typeof fetch;
  try {
    const result = await flow.finish(
      { query: { state: cookie, code: 'code' }, cookies: { google_state: cookie } } as any,
      res,
    );
    assert.equal(result.email, 'user@example.com');
    assert.equal(result.sub, 'google-id');
    assert.equal(result.invited, true);
    flow.start(res, '', false);
    globalThis.fetch = (async (url: string) =>
      new Response(
        JSON.stringify(
          url.includes('/token')
            ? { access_token: 'test' }
            : { sub: 'google-id', email: 'user@example.com', email_verified: false },
        ),
      )) as typeof fetch;
    await assert.rejects(
      flow.finish(
        { query: { state: cookie, code: 'code' }, cookies: { google_state: cookie } } as any,
        res,
      ),
      /verified email/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
