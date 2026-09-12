import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTemplate } from '../shared/template';
import { gameSchema, applyProposal } from '../shared/schema';
import { stepBody } from '../src/engine/physics';
test('template validates and supports variable chapter counts', () => {
  const game = createTemplate();
  assert.equal(gameSchema.parse(game).levels.length, 3);
  game.levels = game.levels.slice(0, 1);
  assert.ok(gameSchema.safeParse(game).success);
});
test('rejects executable assets, unbounded physics and duplicate heroes', () => {
  for (const mutate of [
    (g: any) => (g.characters[0].sprite = 'javascript:alert(1)'),
    (g: any) => (g.physics.gravity = 0),
    (g: any) => (g.characters[1].role = 'hero'),
    (g: any) => (g.levels[0].platforms[0].x = 9999),
  ]) {
    const g = createTemplate();
    mutate(g);
    assert.equal(gameSchema.safeParse(g).success, false);
  }
});
test('AI changes are atomic, bounded, and cannot mutate prototypes or code', () => {
  const original = createTemplate();
  const result = applyProposal(original, {
    summary: 'A warmer scene',
    changes: [{ path: 'levels.0.theme', value: 'sunset' }],
  });
  assert.equal(result.levels[0].theme, 'sunset');
  assert.equal(original.levels[0].theme, 'meadow');
  for (const path of [
    '__proto__.polluted',
    'characters.0.sprite',
    'physics.constructor.prototype',
    'levels.55.name',
    'levels.0.platforms.99.x',
  ])
    assert.throws(() =>
      applyProposal(original, { summary: 'unsafe', changes: [{ path, value: 'x' }] }),
    );
  assert.throws(() =>
    applyProposal(original, {
      summary: 'invalid',
      changes: [
        { path: 'title', value: 'Should not leak' },
        { path: 'physics.speed', value: 99999 },
      ],
    }),
  );
  assert.notEqual(original.title, 'Should not leak');
});
test('collision catches fast falls without tunneling and clamps world bounds', () => {
  const level = createTemplate().levels[0];
  const b = { x: 370, y: 270, vx: 0, vy: 1000, w: 30, h: 60, grounded: false };
  stepBody(b, 1 / 30, 1500, level, 0);
  assert.equal(b.y, 295);
  assert.equal(b.grounded, true);
  b.x = 0;
  b.vx = -1000;
  stepBody(b, 1 / 60, 1500, level, 0);
  assert.equal(b.x, 0);
});

test('riders travel with moving platforms and release on jump', () => {
  const level = createTemplate().levels[0];
  level.platforms = [{ id: 'lift', x: 100, y: 300, width: 200, motion: 'horizontal' }];
  const body = { x: 130, y: 240, vx: 0, vy: 0, w: 30, h: 60, grounded: true, supportId: 'lift' };
  stepBody(body, 1 / 60, 1500, level, 1 / 60);
  assert.ok(body.x > 130);
  assert.equal(body.grounded, true);
  assert.equal(body.supportId, 'lift');
  body.vy = -600;
  stepBody(body, 1 / 60, 1500, level, 2 / 60);
  assert.equal(body.grounded, false);
  assert.equal(body.supportId, undefined);
});
