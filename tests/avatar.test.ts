import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avatarCacheKey,
  avatarConfigSchema,
  avatarPresets,
  defaultAvatar,
  randomizeAvatar,
  resolveAvatarLayers,
  safeAvatar,
} from '../shared/avatar';
import { createTemplate } from '../shared/template';
import { gameSchema } from '../shared/schema';

test('default avatar is valid, serializable and included in new games', () => {
  assert.deepEqual(
    avatarConfigSchema.parse(JSON.parse(JSON.stringify(defaultAvatar))),
    defaultAvatar,
  );
  assert.deepEqual(createTemplate().characters[0].avatar, defaultAvatar);
  assert.ok(createTemplate().characters.every((character) => character.avatar));
  assert.ok(gameSchema.safeParse(createTemplate()).success);
});

test('invalid component IDs and arbitrary paths fail closed', () => {
  assert.equal(
    avatarConfigSchema.safeParse({ ...defaultAvatar, hair: '../../secret' }).success,
    false,
  );
  assert.deepEqual(safeAvatar({ ...defaultAvatar, top: 'unknown' }), defaultAvatar);
  assert.ok(
    resolveAvatarLayers({ ...defaultAvatar, shoes: '../../secret' }).every((layer) =>
      layer.src.startsWith('/avatars/'),
    ),
  );
});

test('random avatar generation always produces valid library combinations', () => {
  for (let i = 0; i < 100; i++) {
    const avatar = randomizeAvatar(() => (i * 0.61803398875) % 1);
    assert.ok(avatarConfigSchema.safeParse(avatar).success);
    assert.ok(resolveAvatarLayers(avatar).length >= 19);
  }
});

test('presets are varied, valid and use stable cache keys', () => {
  assert.equal(avatarPresets.length, 16);
  assert.equal(new Set(avatarPresets.map((preset) => preset.preset)).size, 16);
  for (const preset of avatarPresets) assert.ok(avatarConfigSchema.safeParse(preset).success);
  assert.equal(avatarCacheKey(defaultAvatar), avatarCacheKey(structuredClone(defaultAvatar)));
  assert.notEqual(
    avatarCacheKey(defaultAvatar),
    avatarCacheKey({ ...defaultAvatar, hair: 'crop' }),
  );
});

test('old projects without avatar configuration remain valid', () => {
  const game = createTemplate();
  delete game.characters[0].avatar;
  assert.ok(gameSchema.safeParse(game).success);
});
