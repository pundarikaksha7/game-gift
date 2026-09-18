import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGameExport,
  exportLocalGame,
  importGameExport,
  parseGameExport,
  stripLocalAssets,
} from '../shared/export';
import { createTemplate } from '../shared/template';

test('legacy JSON exports still import', () => {
  const game = createTemplate();
  assert.deepEqual(parseGameExport(game), { game, assets: {} });
});

test('local animation frames are removed from the valid cloud-save staging copy', () => {
  const game = createTemplate();
  game.animation.frames = ['blob:test-frame'];
  game.characters[0].frames = ['blob:test-character-frame'];
  const staged = stripLocalAssets(game);
  assert.deepEqual(staged.animation.frames, []);
  assert.deepEqual(staged.characters[0].frames, []);
});

test('local custom media survives export and import as a new playable blob URL', async () => {
  const game = createTemplate();
  const original = URL.createObjectURL(new Blob(['custom-art'], { type: 'image/png' }));
  game.characters[0].sprite = original;
  try {
    const file = await exportLocalGame(game);
    const raw = JSON.parse(await file.text());
    assert.equal(raw.format, 'gamegift-bundle-v1');
    assert.equal(raw.assets[original].mime, 'image/png');

    const imported = importGameExport(createGameExport(game, raw.assets));
    assert.match(imported.characters[0].sprite, /^blob:/);
    assert.notEqual(imported.characters[0].sprite, original);
    assert.equal(await (await fetch(imported.characters[0].sprite)).text(), 'custom-art');
    URL.revokeObjectURL(imported.characters[0].sprite);
  } finally {
    URL.revokeObjectURL(original);
  }
});
