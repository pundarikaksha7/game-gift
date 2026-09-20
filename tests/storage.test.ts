import { test } from 'node:test';
import assert from 'node:assert/strict';
import { putAsset, readAsset, deleteAsset } from '../server/storage';
test('private cloud media uses authenticated endpoints and fails on provider errors', async () => {
  const savedFetch = globalThis.fetch;
  const saved = {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET,
  };
  const calls: { url: string; options: RequestInit }[] = [];
  process.env.SUPABASE_URL = 'https://storage-test.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-server-only-key';
  process.env.SUPABASE_STORAGE_BUCKET = 'private-media';
  globalThis.fetch = (async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response('media');
  }) as typeof fetch;
  const id = '12345678-1234-1234-1234-123456789abc';
  try {
    await putAsset(id, Buffer.from('media'), 'image/webp');
    assert.equal((await readAsset(id)).toString(), 'media');
    await deleteAsset(id);
    assert.deepEqual(
      calls.map((c) => c.options.method),
      ['POST', 'GET', 'DELETE'],
    );
    assert.ok(calls[1].url.includes('/object/authenticated/private-media/'));
    assert.ok(calls.every((c) => !c.url.includes('/public/')));
    assert.equal(
      (calls[0].options.headers as Record<string, string>).Authorization,
      'Bearer test-server-only-key',
    );
    await assert.rejects(() => readAsset('../outside'));
    globalThis.fetch = (async () => new Response('denied', { status: 403 })) as typeof fetch;
    for (const operation of [
      () => readAsset(id),
      () => putAsset(id, Buffer.from('x'), 'image/webp'),
    ])
      await assert.rejects(operation, (error: any) => {
        assert.equal(error.status, 503);
        assert.match(error.message, /storage is unavailable/i);
        assert.match(error.detail, /failed \(403\): denied/);
        return true;
      });
    globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch;
    await deleteAsset(id);
  } finally {
    globalThis.fetch = savedFetch;
    for (const [key, value] of Object.entries({
      SUPABASE_URL: saved.url,
      SUPABASE_SERVICE_ROLE_KEY: saved.key,
      SUPABASE_STORAGE_BUCKET: saved.bucket,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
