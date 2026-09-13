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
  const directory = await mkdtemp(`${tmpdir()}/playcraft-test-`);
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
  const server = createApp(db).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  async function request(route: string, method = 'GET', body?: any, cookie = '') {
    const r = await fetch(base + route, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Playcraft-Request': 'test',
        Cookie: cookie,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get('set-cookie')?.split(';')[0] || '',
    };
  }
  try {
    assert.equal((await request('/projects')).status, 401);
    process.env.REGISTRATION_CODE = 'a'.repeat(32);
    assert.equal(
      (
        await request('/auth/register', 'POST', {
          email: 'blocked@example.com',
          password: 'a-long-password',
        })
      ).status,
      403,
    );
    delete process.env.REGISTRATION_CODE;
    const first = await request('/auth/register', 'POST', {
      email: 'alice@example.com',
      name: 'Alice',
      password: 'a-long-password',
    });
    assert.equal(first.status, 200);
    assert.ok(first.cookie.includes('session='));
    const alice = first.cookie;
    const second = await request('/auth/register', 'POST', {
      email: 'bob@example.com',
      password: 'a-long-password',
    });
    const bob = second.cookie;
    assert.equal(
      (
        await request('/auth/login', 'POST', {
          email: 'alice@example.com',
          password: 'not-the-password',
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request('/auth/login', 'POST', {
          email: 'alice@example.com',
          password: 'a-long-password',
        })
      ).status,
      200,
    );
    const game = createTemplate();
    const created = await request('/projects', 'POST', { game }, alice);
    assert.equal(created.status, 201);
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
    game.title = 'Private draft';
    await request(`/projects/${id}`, 'PUT', { game, revision: 3 }, alice);
    assert.equal((await request(`/play/${publishedId}`)).data.game.title, 'Version two');
    const malformed = structuredClone(game);
    malformed.physics.speed = 99999;
    assert.equal(
      (await request(`/projects/${id}`, 'PUT', { game: malformed, revision: 4 }, alice)).status,
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
      headers: { Cookie: alice, 'X-Playcraft-Request': 'test' },
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
      headers: { Cookie: alice, 'X-Playcraft-Request': 'test' },
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
      (await fetch(base.replace('/api', '') + asset.url, { headers: { Cookie: alice } })).status,
      200,
    );
    const stolen = createTemplate();
    stolen.characters[0].sprite = asset.url;
    assert.equal((await request('/projects', 'POST', { game: stolen }, bob)).status, 400);
    game.characters[0].sprite = asset.url;
    await request(`/projects/${id}`, 'PUT', { game, revision: 4 }, alice);
    await request(`/projects/${id}/publish`, 'POST', { revision: 5 }, alice);
    assert.equal((await fetch(base.replace('/api', '') + asset.url)).status, 200);
    await request(`/projects/${id}/publish`, 'DELETE', undefined, alice);
    assert.equal((await request(`/play/${publishedId}`)).status, 404);
    assert.equal((await fetch(base.replace('/api', '') + asset.url)).status, 404);
    assert.equal(
      (await request('/ai/propose', 'POST', { game, prompt: 'make it easy' }, alice)).status,
      503,
    );
    const csrf = await fetch(base + '/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: alice },
      body: JSON.stringify({ game }),
    });
    assert.equal(csrf.status, 403);
    const origin = await fetch(base + '/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: alice,
        'X-Playcraft-Request': 'test',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify({ game }),
    });
    assert.equal(origin.status, 403);
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
    assert.equal(
      (
        await request(
          '/auth/password',
          'POST',
          { currentPassword: 'wrong-password', password: 'new-long-password' },
          alice,
        )
      ).status,
      401,
    );
    const changed = await request(
      '/auth/password',
      'POST',
      { currentPassword: 'a-long-password', password: 'new-long-password' },
      alice,
    );
    assert.equal(changed.status, 200);
    assert.equal((await request('/auth/me', 'GET', undefined, alice)).status, 401);
    assert.equal(
      (
        await request('/auth/login', 'POST', {
          email: 'alice@example.com',
          password: 'a-long-password',
        })
      ).status,
      401,
    );
    assert.equal(
      (await request('/auth/account', 'DELETE', { password: 'wrong-password' }, changed.cookie))
        .status,
      401,
    );
    assert.equal(
      (await request('/auth/account', 'DELETE', { password: 'new-long-password' }, changed.cookie))
        .status,
      200,
    );
    assert.equal((await request('/auth/me', 'GET', undefined, changed.cookie)).status, 401);
    assert.equal((await db.query('SELECT * FROM projects WHERE id=$1', [id])).length, 0);
    await maintain(db);
    assert.deepEqual(await readdir(`${directory}/uploads`), []);
    assert.equal((await request('/auth/me', 'GET', undefined, bob)).status, 200);
    await request('/auth/logout', 'POST', undefined, alice);
    assert.equal((await request('/auth/me', 'GET', undefined, alice)).status, 401);
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
