import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseIdentity } from '../server/supabase-auth';

test('Supabase identity is remotely verified and requires a confirmed, non-anonymous user', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'public-key';
  try {
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(url), 'https://project.supabase.co/auth/v1/user');
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        'Bearer verified-token',
      );
      return Response.json({
        id: 'user-1',
        email: 'Creator@Example.com',
        email_confirmed_at: '2026-09-14T00:00:00Z',
        is_anonymous: false,
        user_metadata: { name: 'Creator' },
      });
    }) as typeof fetch;
    assert.deepEqual(await supabaseIdentity('Bearer verified-token'), {
      id: 'user-1',
      email: 'creator@example.com',
      name: 'Creator',
    });

    globalThis.fetch = (async () =>
      Response.json({
        id: 'anonymous',
        email: 'guest@example.com',
        is_anonymous: true,
      })) as typeof fetch;
    await assert.rejects(() => supabaseIdentity('Bearer guest-token'), /verified email/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
