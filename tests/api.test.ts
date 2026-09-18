import sharp from 'sharp';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { openDatabase } from '../server/db';
import { createApp } from '../server/app';
import { maintain } from '../server/maintenance';
import { readdir } from 'node:fs/promises';
import { createTemplate } from '../shared/template';
test('account isolation, revisions, uploads, publication and session lifecycle', async () => {
  const directory = await mkdtemp(`${tmpdir()}/game-gift-test-`);
  process.env.DATA_DIR = directory;
  const postgres = process.env.TEST_DATABASE_URL
    ? new Pool({ connectionString: process.env.TEST_DATABASE_URL })
    : null;
  const schema = 'test_' + randomUUID().replaceAll('-', '');
  delete process.env.DATABASE_URL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  if (postgres) {
    await postgres.query(`CREATE SCHEMA ${schema}`);
    const url = new URL(process.env.TEST_DATABASE_URL!);
    url.searchParams.set('options', `-c search_path=${schema}`);
    process.env.DATABASE_URL = url.toString();
  }
  const db = await openDatabase();
  const identities = {
    'Bearer alice-token': { id: 'alice', email: 'alice@example.com', name: 'Alice' },
    'Bearer bob-token': { id: 'bob', email: 'bob@example.com', name: 'Bob' },
  } as const;
  for (const user of Object.values(identities))
    await db.query(
      "INSERT INTO users(id,email,password,name,auth_provider,auth_subject) VALUES ($1,$2,'!supabase',$3,'supabase',$1)",
      [user.id, user.email, user.name],
    );
  const server = createApp(db, {
    authenticate: async (authorization) => {
      const user = identities[authorization as keyof typeof identities];
      if (!user) throw Object.assign(new Error('Sign in again with Google'), { status: 401 });
      return { ...user, authSubject: user.id };
    },
  }).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  async function request(route: string, method = 'GET', body?: any, token = '') {
    const r = await fetch(base + route, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: r.status,
      data: await r.json(),
    };
  }
  try {
    assert.equal((await request('/projects')).status, 401);
    const alice = 'alice-token';
    const bob = 'bob-token';
    assert.equal((await request('/auth/register', 'POST', {}, alice)).status, 404);
    assert.equal((await request('/auth/login', 'POST', {}, alice)).status, 404);
    const game = createTemplate();
    const created = await request('/projects', 'POST', { game }, alice);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.id;
    assert.equal((await request(`/projects/${id}`, 'GET', undefined, bob)).status, 404);
    assert.equal((await request(`/projects/${id}`, 'PUT', { game, revision: 1 }, bob)).status, 404);
    game.title = 'Version two';
    const updated = await request(`/projects/${id}`, 'PUT', { game, revision: 1 }, alice);
    assert.equal(updated.data.revision, 2);
    assert.equal(
      (await request(`/projects/${id}`, 'PUT', { game, revision: 1 }, alice)).status,
      409,
    );
    const concurrent = await Promise.all([
      request(`/projects/${id}`, 'PUT', { game, revision: 2 }, alice),
      request(`/projects/${id}`, 'PUT', { game, revision: 2 }, alice),
    ]);
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
    const revisions = await request(`/projects/${id}/revisions`, 'GET', undefined, alice);
    assert.equal(revisions.data.revisions.length, 3);
    assert.equal(
      (await request(`/projects/${id}/revisions/1`, 'GET', undefined, alice)).data.game.title,
      created.data.game.title,
    );
    assert.equal(
      (await request(`/projects/${id}/publish`, 'POST', { revision: 2 }, alice)).status,
      409,
    );
    const published = await request(`/projects/${id}/publish`, 'POST', { revision: 3 }, alice);
    assert.equal(published.status, 200);
    const publishedId = published.data.publishedId;
    assert.equal(published.data.url, `/play/alice/${publishedId}`);
    assert.equal(
      (await request(`/projects/${id}`, 'GET', undefined, alice)).data.publishedUrl,
      published.data.url,
    );
    assert.equal((await request(`/projects/${id}/export`, 'GET', undefined, bob)).status, 404);
    const exported = await fetch(`${base}/projects/${id}/export`, {
      headers: { Authorization: `Bearer ${alice}` },
    });
    assert.equal(exported.status, 200);
    assert.match(exported.headers.get('content-disposition') || '', /\.game-gift\.json/);
    const exportedBundle = (await exported.json()) as any;
    assert.equal(exportedBundle.format, 'gamegift-bundle-v1');
    assert.equal(exportedBundle.game.title, 'Version two');
    game.title = 'Private draft';
    await request(`/projects/${id}`, 'PUT', { game, revision: 3 }, alice);
    assert.equal((await request(`/play/alice/${publishedId}`)).data.game.title, 'Version two');
    assert.equal((await request(`/play/bob/${publishedId}`)).status, 404);
    const malformed = structuredClone(game);
    malformed.physics.speed = 99999;
    assert.equal(
      (await request(`/projects/${id}`, 'PUT', { game: malformed, revision: 4 }, alice)).status,
      400,
    );
    const localOnly = structuredClone(game);
    localOnly.characters[0].sprite = 'blob:http://127.0.0.1/12345678-1234-1234-1234-123456789abc';
    assert.equal(
      (await request(`/projects/${id}`, 'PUT', { game: localOnly, revision: 4 }, alice)).status,
      400,
    );
    const form = new FormData();
    form.append(
      'file',
      new Blob(['<svg onload="alert(1)"></svg>'], { type: 'image/svg+xml' }),
      'bad.svg',
    );
    const bad = await fetch(base + '/assets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${alice}` },
      body: form,
    });
    assert.equal(bad.status, 400);
    const png = new FormData();
    png.append(
      'file',
      new Blob(
        [
          new Uint8Array(
            await sharp({ create: { width: 2, height: 2, channels: 4, background: '#779966' } })
              .png()
              .toBuffer(),
          ),
        ],
        { type: 'image/png' },
      ),
      'hero.png',
    );
    const upload = await fetch(base + '/assets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${alice}` },
      body: png,
    });
    assert.equal(upload.status, 201);
    const asset = (await upload.json()) as any;
    assert.equal(asset.mime, 'image/webp');
    const wrongSlot = createTemplate();
    wrongSlot.sounds.music = asset.url;
    assert.equal((await request('/projects', 'POST', { game: wrongSlot }, alice)).status, 400);
    assert.equal((await fetch(base.replace('/api', '') + asset.url)).status, 404);
    assert.equal(
      (
        await fetch(base.replace('/api', '') + asset.url, {
          headers: { Authorization: `Bearer ${alice}` },
        })
      ).status,
      200,
    );
    const stolen = createTemplate();
    stolen.characters[0].sprite = asset.url;
    assert.equal((await request('/projects', 'POST', { game: stolen }, bob)).status, 400);
    game.characters[0].sprite = asset.url;
    await request(`/projects/${id}`, 'PUT', { game, revision: 4 }, alice);
    const exportWithAsset = await fetch(`${base}/projects/${id}/export`, {
      headers: { Authorization: `Bearer ${alice}` },
    });
    const assetBundle = (await exportWithAsset.json()) as any;
    assert.equal(assetBundle.game.characters[0].sprite, asset.url);
    assert.equal(assetBundle.assets[asset.url].mime, 'image/webp');
    assert.ok(Buffer.from(assetBundle.assets[asset.url].data, 'base64').length > 0);
    await request(`/projects/${id}/publish`, 'POST', { revision: 5 }, alice);
    assert.equal((await fetch(base.replace('/api', '') + asset.url)).status, 200);
    await request(`/projects/${id}/publish`, 'DELETE', undefined, alice);
    assert.equal((await request(`/play/alice/${publishedId}`)).status, 404);
    assert.equal((await fetch(base.replace('/api', '') + asset.url)).status, 404);
    assert.equal(
      (await request('/ai/propose', 'POST', { game, prompt: 'make it easy' }, alice)).status,
      503,
    );
    const origin = await fetch(base + '/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify({ game }),
    });
    assert.equal(origin.status, 403);
    const proxiedBearer = await fetch(base + '/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bob}`,
        Origin: 'https://frontend-proxy.example',
      },
      body: JSON.stringify({ game: createTemplate() }),
    });
    assert.equal(proxiedBearer.status, 201);
    for (let revision = 5; revision < 105; revision++) {
      assert.equal(
        (await request(`/projects/${id}`, 'PUT', { game, revision }, alice)).status,
        200,
      );
    }
    assert.equal(
      Number(
        (await db.query('SELECT COUNT(*) AS total FROM revisions WHERE project_id=$1', [id]))[0]
          .total,
      ),
      100,
    );
    assert.equal(
      (await request(`/projects/${id}/revisions/1`, 'GET', undefined, alice)).status,
      404,
    );
    const disposable = await request('/projects', 'POST', { game: createTemplate() }, bob);
    assert.equal(
      (await request(`/projects/${disposable.data.id}`, 'DELETE', undefined, bob)).status,
      200,
    );
    assert.equal(
      (await request(`/projects/${disposable.data.id}`, 'GET', undefined, bob)).status,
      404,
    );
    assert.equal((await request(`/projects/${id}`, 'DELETE', undefined, bob)).status, 404);
    assert.equal((await request('/auth/password', 'POST', {}, alice)).status, 404);
    assert.equal((await request('/auth/account', 'DELETE', {}, alice)).status, 400);
    const deleted = await fetch(`${base}/auth/account`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${alice}`,
        'X-Confirm-Account-Deletion': 'delete',
      },
    });
    assert.equal(deleted.status, 200);
    assert.equal((await db.query('SELECT * FROM projects WHERE id=$1', [id])).length, 0);
    // Remote Supabase deletion is covered separately; keep this test focused on local cleanup.
    await db.query("UPDATE deleted_accounts SET processed_at='test'");
    await maintain(db);
    assert.deepEqual(await readdir(`${directory}/uploads`), []);
    assert.equal((await request('/auth/me', 'GET', undefined, bob)).status, 200);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
    if (postgres) {
      await postgres.query(`DROP SCHEMA ${schema} CASCADE`);
      await postgres.end();
    }
    await rm(directory, { recursive: true, force: true });
  }
});
