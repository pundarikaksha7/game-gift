import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avatarCacheKey,
  avatarConfigSchema,
  avatarPresets,
  CHARACTER_COUNT,
  defaultAvatar,
  randomizeAvatar,
  resolveAvatarAsset,
  resolveAvatarFrames,
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

test('invalid appearance IDs and arbitrary values fail closed', () => {
  assert.equal(
    avatarConfigSchema.safeParse({ ...defaultAvatar, appearance: '../../secret' }).success,
    false,
  );
  assert.deepEqual(safeAvatar({ ...defaultAvatar, outfit: 'unknown' }), defaultAvatar);
  assert.match(resolveAvatarAsset(defaultAvatar), /^\/assets\/characters\/sprites\/character-\d{2}\.webp$/);
});

test('random avatar generation always produces valid library combinations', () => {
  for (let i = 0; i < 100; i++) {
    const avatar = randomizeAvatar(() => (i * 0.61803398875) % 1);
    assert.ok(avatarConfigSchema.safeParse(avatar).success);
    assert.deepEqual(resolveAvatarFrames(avatar, 'run'), [resolveAvatarAsset(avatar)]);
  }
});

test('presets are varied, valid and use stable cache keys', () => {
  assert.equal(avatarPresets.length, CHARACTER_COUNT);
  assert.equal(new Set(avatarPresets.map((preset) => preset.appearance)).size, CHARACTER_COUNT);
  for (const preset of avatarPresets) assert.ok(avatarConfigSchema.safeParse(preset).success);
  assert.equal(avatarCacheKey(defaultAvatar), avatarCacheKey(structuredClone(defaultAvatar)));
  assert.notEqual(avatarCacheKey(defaultAvatar), avatarCacheKey(avatarPresets[0]));
});

test('old projects without avatar configuration remain valid', () => {
  const game = createTemplate();
  delete game.characters[0].avatar;
  assert.ok(gameSchema.safeParse(game).success);
});
