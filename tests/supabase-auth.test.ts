import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { authenticateSupabase, supabaseIdentity } from '../server/supabase-auth';
import { openDatabase } from '../server/db';

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

test('a verified Supabase identity adopts its legacy profile without losing its app user id', async () => {
  const originalFetch = globalThis.fetch;
  const directory = await mkdtemp(`${tmpdir()}/game-gift-supabase-link-`);
  const originalDataDir = process.env.DATA_DIR;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATA_DIR = directory;
  delete process.env.DATABASE_URL;
  const db = await openDatabase();
  try {
    await db.query(
      "INSERT INTO users(id,email,password,name,auth_provider) VALUES ('legacy-1','creator@example.com','legacy-password','Original Creator','legacy')",
    );
    globalThis.fetch = (async () =>
      Response.json({
        id: 'supabase-1',
        email: 'Creator@Example.com',
        email_confirmed_at: '2026-09-14T00:00:00Z',
        is_anonymous: false,
        user_metadata: { name: 'Google Creator' },
      })) as typeof fetch;

    assert.deepEqual(await authenticateSupabase(db, 'Bearer verified-token'), {
      id: 'legacy-1',
      email: 'creator@example.com',
      name: 'Original Creator',
      authSubject: 'supabase-1',
    });
    const [profile] = await db.query(
      'SELECT id,auth_provider,auth_subject FROM users WHERE email=$1',
      ['creator@example.com'],
    );
    assert.deepEqual(
      { ...profile },
      {
        id: 'legacy-1',
        auth_provider: 'supabase',
        auth_subject: 'supabase-1',
      },
    );

    globalThis.fetch = (async () =>
      Response.json({
        id: 'different-supabase-user',
        email: 'creator@example.com',
        email_confirmed_at: '2026-09-14T00:00:00Z',
        is_anonymous: false,
      })) as typeof fetch;
    await assert.rejects(() => authenticateSupabase(db, 'Bearer another-token'), /verified email/);
  } finally {
    globalThis.fetch = originalFetch;
    await db.close();
    await rm(directory, { recursive: true, force: true });
    if (originalDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = originalDataDir;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});
