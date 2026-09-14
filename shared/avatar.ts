import { z } from 'zod';

export const AVATAR_VERSION = 1 as const;
export const avatarId = z.string().regex(/^[a-z0-9-]{1,48}$/);

export const avatarCatalog = {
  base: ['classic'],
  skinTone: ['porcelain', 'peach', 'sand', 'golden', 'caramel', 'umber', 'cocoa', 'deep'],
  hair: [
    'crop',
    'swoop',
    'quiff',
    'tuft',
    'wave',
    'shag',
    'side',
    'spike',
    'bob',
    'long',
    'pony',
    'curls',
  ],
  hairColor: ['black', 'brown', 'chestnut', 'blonde', 'red', 'silver'],
  eyes: ['bright-black', 'bright-blue', 'bright-brown', 'bright-green', 'soft-pine'],
  mouth: ['glad', 'happy', 'oh', 'straight', 'teeth'],
  top: [
    'sky-tee',
    'forest-tee',
    'cloud-tee',
    'navy-tee',
    'pine-tee',
    'coral-tee',
    'sunny-tee',
    'slate-tee',
  ],
  bottom: [
    'blue-jeans',
    'denim-jeans',
    'brown-pants',
    'green-pants',
    'grey-pants',
    'navy-pants',
    'red-pants',
    'tan-pants',
  ],
  shoes: ['black-shoes', 'blue-shoes', 'brown-shoes', 'grey-shoes', 'red-shoes', 'tan-shoes'],
} as const;

export type AvatarCategory = keyof typeof avatarCatalog;
export const avatarConfigSchema = z
  .object({
    version: z.literal(AVATAR_VERSION),
    source: z.enum(['library', 'generated']).default('library'),
    base: z.enum(avatarCatalog.base),
    skinTone: z.enum(avatarCatalog.skinTone),
    hair: z.enum(avatarCatalog.hair),
    hairColor: z.enum(avatarCatalog.hairColor),
    eyes: z.enum(avatarCatalog.eyes),
    mouth: z.enum(avatarCatalog.mouth),
    top: z.enum(avatarCatalog.top),
    bottom: z.enum(avatarCatalog.bottom),
    shoes: z.enum(avatarCatalog.shoes),
    accessories: z.array(avatarId).max(3).default([]),
    preset: avatarId.optional(),
    generatedAssetId: avatarId.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (config.source === 'library' && config.generatedAssetId)
      ctx.addIssue({
        code: 'custom',
        path: ['generatedAssetId'],
        message: 'Library avatars cannot reference generated assets',
      });
    if (config.accessories.length)
      ctx.addIssue({
        code: 'custom',
        path: ['accessories'],
        message: 'Accessories are not available in avatar schema v1',
      });
  });

export type AvatarConfig = z.infer<typeof avatarConfigSchema>;

export const defaultAvatar: AvatarConfig = {
  version: 1,
  source: 'library',
  base: 'classic',
  skinTone: 'golden',
  hair: 'swoop',
  hairColor: 'brown',
  eyes: 'bright-brown',
  mouth: 'happy',
  top: 'coral-tee',
  bottom: 'blue-jeans',
  shoes: 'brown-shoes',
  accessories: [],
  preset: 'preset-01',
};

const presetChoices: Omit<AvatarConfig, 'version' | 'source' | 'base' | 'accessories'>[] = [
  ['golden', 'swoop', 'brown', 'bright-brown', 'happy', 'coral-tee', 'blue-jeans', 'brown-shoes'],
  ['deep', 'curls', 'black', 'bright-brown', 'glad', 'sunny-tee', 'navy-pants', 'red-shoes'],
  ['porcelain', 'bob', 'red', 'bright-green', 'happy', 'forest-tee', 'tan-pants', 'brown-shoes'],
  ['cocoa', 'crop', 'black', 'soft-pine', 'straight', 'sky-tee', 'grey-pants', 'black-shoes'],
  ['sand', 'long', 'blonde', 'bright-blue', 'glad', 'navy-tee', 'denim-jeans', 'blue-shoes'],
  ['umber', 'quiff', 'chestnut', 'bright-brown', 'teeth', 'cloud-tee', 'red-pants', 'black-shoes'],
  ['peach', 'pony', 'brown', 'bright-green', 'happy', 'pine-tee', 'blue-jeans', 'tan-shoes'],
  ['caramel', 'shag', 'black', 'bright-black', 'oh', 'slate-tee', 'green-pants', 'grey-shoes'],
  ['golden', 'wave', 'red', 'bright-green', 'glad', 'sunny-tee', 'brown-pants', 'red-shoes'],
  ['deep', 'side', 'silver', 'bright-blue', 'happy', 'cloud-tee', 'navy-pants', 'blue-shoes'],
  ['porcelain', 'tuft', 'blonde', 'bright-blue', 'straight', 'sky-tee', 'red-pants', 'black-shoes'],
  ['cocoa', 'long', 'black', 'bright-brown', 'teeth', 'coral-tee', 'tan-pants', 'brown-shoes'],
  ['sand', 'spike', 'chestnut', 'soft-pine', 'happy', 'forest-tee', 'grey-pants', 'grey-shoes'],
  ['umber', 'bob', 'silver', 'bright-black', 'glad', 'navy-tee', 'blue-jeans', 'red-shoes'],
  ['peach', 'curls', 'red', 'bright-green', 'oh', 'pine-tee', 'denim-jeans', 'tan-shoes'],
  ['caramel', 'crop', 'brown', 'bright-brown', 'happy', 'slate-tee', 'brown-pants', 'black-shoes'],
].map(([skinTone, hair, hairColor, eyes, mouth, top, bottom, shoes], index) => ({
  skinTone,
  hair,
  hairColor,
  eyes,
  mouth,
  top,
  bottom,
  shoes,
  preset: `preset-${String(index + 1).padStart(2, '0')}`,
})) as Omit<AvatarConfig, 'version' | 'source' | 'base' | 'accessories'>[];

export const avatarPresets: AvatarConfig[] = presetChoices.map((choice) => ({
  version: 1,
  source: 'library',
  base: 'classic',
  accessories: [],
  ...choice,
}));

export function parseAvatar(value: unknown): AvatarConfig {
  return avatarConfigSchema.parse(value);
}

export function safeAvatar(value: unknown): AvatarConfig {
  const parsed = avatarConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : structuredClone(defaultAvatar);
}

export function randomizeAvatar(random = Math.random): AvatarConfig {
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!;
  return avatarConfigSchema.parse({
    version: 1,
    source: 'library',
    base: 'classic',
    accessories: [],
    skinTone: pick(avatarCatalog.skinTone),
    hair: pick(avatarCatalog.hair),
    hairColor: pick(avatarCatalog.hairColor),
    eyes: pick(avatarCatalog.eyes),
    mouth: pick(avatarCatalog.mouth),
    top: pick(avatarCatalog.top),
    bottom: pick(avatarCatalog.bottom),
    shoes: pick(avatarCatalog.shoes),
  });
}

export function avatarCacheKey(config: AvatarConfig): string {
  const stable = JSON.stringify({ ...config, preset: undefined });
  let hash = 2166136261;
  for (let i = 0; i < stable.length; i++) hash = Math.imul(hash ^ stable.charCodeAt(i), 16777619);
  return `avatar:v${config.version}:${(hash >>> 0).toString(36)}`;
}

export type AvatarLayer = { src: string; x: number; y: number; width?: number; flipX?: boolean };
const skinNumber = (id: AvatarConfig['skinTone']) => avatarCatalog.skinTone.indexOf(id) + 1;
const hairNumber = (id: AvatarConfig['hair']) => avatarCatalog.hair.indexOf(id) + 1;
const hairPrefix: Record<AvatarConfig['hairColor'], string> = {
  black: 'black',
  brown: 'brown1',
  chestnut: 'brown2',
  blonde: 'blonde',
  red: 'red',
  silver: 'grey',
};
const topPrefix: Record<AvatarConfig['top'], string> = {
  'sky-tee': 'blue',
  'forest-tee': 'green',
  'cloud-tee': 'white',
  'navy-tee': 'navy',
  'pine-tee': 'pine',
  'coral-tee': 'red',
  'sunny-tee': 'yellow',
  'slate-tee': 'grey',
};
const bottomPrefix: Record<AvatarConfig['bottom'], string> = {
  'blue-jeans': 'blue1',
  'denim-jeans': 'blue2',
  'brown-pants': 'brown',
  'green-pants': 'green',
  'grey-pants': 'grey',
  'navy-pants': 'navy',
  'red-pants': 'red',
  'tan-pants': 'tan',
};
const shoePrefix: Record<AvatarConfig['shoes'], string> = {
  'black-shoes': 'black',
  'blue-shoes': 'blue',
  'brown-shoes': 'brown1',
  'grey-shoes': 'grey',
  'red-shoes': 'red',
  'tan-shoes': 'tan',
};

/** Resolves trusted IDs to a fixed allowlisted layer graph; no client path is accepted. */
export function resolveAvatarLayers(raw: unknown): AvatarLayer[] {
  const c = safeAvatar(raw),
    skin = `skin-${skinNumber(c.skinTone)}`;
  return [
    { src: `/avatars/base/${skin}-leg.png`, x: 55, y: 198, width: 78 },
    { src: `/avatars/base/${skin}-leg.png`, x: 127, y: 198, width: 78, flipX: true },
    { src: `/avatars/base/${skin}-arm.png`, x: 8, y: 116, width: 120 },
    { src: `/avatars/base/${skin}-arm.png`, x: 132, y: 116, width: 120, flipX: true },
    { src: `/avatars/tops/${topPrefix[c.top]}-arm.png`, x: 8, y: 116, width: 120 },
    { src: `/avatars/tops/${topPrefix[c.top]}-arm.png`, x: 132, y: 116, width: 120, flipX: true },
    { src: `/avatars/base/${skin}-hand.png`, x: 10, y: 174, width: 42 },
    { src: `/avatars/base/${skin}-hand.png`, x: 208, y: 174, width: 42, flipX: true },
    { src: `/avatars/bottoms/${bottomPrefix[c.bottom]}-leg.png`, x: 55, y: 198, width: 78 },
    {
      src: `/avatars/bottoms/${bottomPrefix[c.bottom]}-leg.png`,
      x: 127,
      y: 198,
      width: 78,
      flipX: true,
    },
    { src: `/avatars/shoes/${shoePrefix[c.shoes]}.png`, x: 52, y: 305, width: 65 },
    { src: `/avatars/shoes/${shoePrefix[c.shoes]}.png`, x: 143, y: 305, width: 65, flipX: true },
    { src: `/avatars/base/${skin}-neck.png`, x: 82, y: 100 },
    { src: `/avatars/tops/${topPrefix[c.top]}-shirt.png`, x: 45, y: 118 },
    { src: `/avatars/bottoms/${bottomPrefix[c.bottom]}-waist.png`, x: 84, y: 190 },
    { src: `/avatars/base/${skin}-head.png`, x: 43, y: 0 },
    { src: `/avatars/eyes/${c.eyes}.png`, x: 116, y: 53 },
    { src: `/avatars/eyes/${c.eyes}.png`, x: 140, y: 53, flipX: true },
    { src: `/avatars/mouth/${c.mouth}.png`, x: 113, y: 78 },
    { src: `/avatars/hair/${hairPrefix[c.hairColor]}-${hairNumber(c.hair)}.png`, x: 43, y: 0 },
  ];
}
