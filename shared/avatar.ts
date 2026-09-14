import { z } from 'zod';

export const AVATAR_VERSION = 3 as const;
export const CHARACTER_COUNT = 39;
const characterIds = Array.from(
  { length: CHARACTER_COUNT },
  (_, index) => `character-${String(index + 1).padStart(2, '0')}`,
) as [string, ...string[]];

const avatarV3 = z
  .object({
    version: z.literal(AVATAR_VERSION),
    source: z.literal('character-library'),
    appearance: z.enum(characterIds),
  })
  .strict();
const oldAvatar = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    appearance: z.string().optional(),
  })
  .passthrough();
export type AvatarConfig = z.infer<typeof avatarV3>;

export function avatarForIndex(index: number): AvatarConfig {
  const safeIndex = Math.max(0, Math.min(CHARACTER_COUNT - 1, Math.floor(index)));
  return {
    version: AVATAR_VERSION,
    source: 'character-library',
    appearance: characterIds[safeIndex],
  };
}
export const defaultAvatar = avatarForIndex(8);
export const avatarPresets = characterIds.map((_, index) => avatarForIndex(index));

function migrateOldAvatar(value: z.infer<typeof oldAvatar>): AvatarConfig {
  const match = value.appearance?.match(/(\d+)$/);
  return avatarForIndex(match ? Number(match[1]) - 1 : 8);
}
export const avatarConfigSchema = z
  .union([avatarV3, oldAvatar])
  .transform((value) => (value.version === AVATAR_VERSION ? value : migrateOldAvatar(value)));
export function parseAvatar(value: unknown): AvatarConfig {
  return avatarConfigSchema.parse(value);
}
export function safeAvatar(value: unknown): AvatarConfig {
  const parsed = avatarConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : structuredClone(defaultAvatar);
}
export function randomizeAvatar(random = Math.random): AvatarConfig {
  return avatarForIndex(Math.floor(random() * CHARACTER_COUNT));
}
export function avatarCacheKey(config: AvatarConfig): string {
  return `avatar:v3:${safeAvatar(config).appearance}`;
}
export type AvatarMotion = 'idle' | 'run' | 'jump';
export function resolveAvatarAsset(config: AvatarConfig): string {
  return `/assets/characters/sprites/${safeAvatar(config).appearance}.webp`;
}
export function resolveAvatarFrames(config: AvatarConfig, _motion: AvatarMotion): string[] {
  return [resolveAvatarAsset(config)];
}
export function roleSprite(_role: 'enemy' | 'friend', index = 0): string {
  return resolveAvatarAsset(avatarForIndex(index));
}
