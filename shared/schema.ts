import { z } from 'zod';
import { avatarConfigSchema } from './avatar';
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const text = z.string().max(2000);
export const assetUrl = z
  .string()
  .max(256)
  .refine(
    (v) => v === '' || /^\/api\/assets\/[a-f0-9-]{36}$/.test(v) || /^blob:/i.test(v),
    'Use an uploaded asset',
  );
export const characterSchema = z
  .object({
    id,
    name: z.string().min(1).max(60),
    role: z.enum(['hero', 'enemy', 'friend']),
    sprite: assetUrl,
    color,
    scale: z.number().min(0.5).max(2),
    archetype: z.enum(['small', 'medium', 'large']).optional(),
    health: z.number().min(1).max(2000).optional(),
    damage: z.number().min(0.1).max(100).optional(),
    moveSpeed: z.number().min(10).max(500).optional(),
    attackCooldown: z.number().min(0.1).max(10).optional(),
    helperRange: z.number().min(30).max(1000).optional(),
    frames: z.array(assetUrl).max(24).optional(),
    avatar: avatarConfigSchema.optional(),
  })
  .strict();
export const platformSchema = z
  .object({
    id,
    x: z.number().min(0).max(10000),
    y: z.number().min(160).max(460),
    width: z.number().min(60).max(600),
    motion: z.enum(['none', 'horizontal', 'vertical', 'both']),
    amplitude: z.number().min(0).max(300).optional(),
    period: z.number().min(1.4).max(20).optional(),
  })
  .strict();
export const levelSchema = z
  .object({
    id,
    name: z.string().min(1).max(80),
    theme: z.enum(['meadow', 'sunset', 'midnight']),
    background: assetUrl.optional(),
    width: z.number().int().min(1200).max(10000),
    enemyCount: z.number().int().min(0).max(200),
    enemyIq: z.enum(['low', 'high']).optional(),
    difficulty: z.enum(['custom', 'easy', 'difficult', 'hard']).optional(),
    platforms: z.array(platformSchema).max(80),
    intro: text,
    outro: text,
    boss: z
      .object({
        enabled: z.boolean(),
        characterId: id.optional(),
        name: z.string().max(60),
        health: z.number().min(1).max(5000),
        damage: z.number().min(0.1).max(10),
        enrageAt: z.number().min(0.05).max(0.9),
        armor: z.number().min(0.1).max(1),
      })
      .strict()
      .optional(),
    holes: z
      .array(
        z.object({ x: z.number().min(0).max(10000), width: z.number().min(20).max(1500) }).strict(),
      )
      .max(20)
      .optional(),
    crossingPlatforms: z.boolean().optional(),
    requireDefeatAll: z.boolean().optional(),
    powerup: z.enum(['none', 'companion', 'beam', 'boost', 'mixed']).optional(),
  })
  .strict();
export const animationSchema = z
  .object({
    preset: z.enum(['bounce', 'float', 'none']),
    speed: z.number().min(0.2).max(3),
    squash: z.number().min(0).max(0.3),
    frames: z.array(assetUrl.refine((v) => v.length > 0)).max(24),
    fps: z.number().int().min(1).max(30),
  })
  .strict();
export const mechanicsSchema = z
  .object({
    punchDamage: z.number().min(1).max(100).default(12),
    kickDamage: z.number().min(1).max(150).default(22),
    punchCooldown: z.number().min(0.1).max(3).default(0.28),
    kickCooldown: z.number().min(0.1).max(5).default(0.7),
    punchRange: z.number().min(10).max(400).default(48),
    kickRange: z.number().min(10).max(600).default(86),
    beamDamage: z.number().min(1).max(200).default(24),
    beamRange: z.number().min(50).max(1500).default(360),
    invincibility: z.number().min(0.1).max(5).default(0.85),
    fallDamage: z.number().min(0).max(10).default(1),
    stompDamage: z.number().min(1).max(150).default(18),
    aggressionRange: z.number().min(30).max(1000).default(104),
    healthDrops: z.boolean().default(true),
    powerupChance: z.number().min(0).max(1).default(0.25),
    powerupLimit: z.number().int().min(0).max(30).default(2),
    pickupDelay: z.number().min(0).max(5).default(1),
    helperDuration: z.number().min(1).max(300).default(24),
    beamDuration: z.number().min(1).max(300).default(18),
    boostDuration: z.number().min(1).max(300).default(14),
    boostMultiplier: z.number().min(1).max(10).default(1.8),
    helpersAtStart: z.boolean().default(false),
    phoneEvent: z.boolean().default(false),
    motorcycleSpeed: z.number().min(100).max(3000).default(1120),
    screenShake: z.boolean().default(true),
    combos: z.boolean().default(true),
    healthBars: z.boolean().default(true),
  })
  .strict();
export const gameSchema = z
  .object({
    schemaVersion: z.literal(1),
    engine: z.enum(['classic', 'adventure']).optional(),
    mechanics: mechanicsSchema.optional(),
    title: z.string().min(1).max(80),
    description: text,
    recipient: z.string().max(60),
    characters: z.array(characterSchema).min(1).max(12),
    levels: z.array(levelSchema).min(1).max(12),
    story: z.object({ opening: text, ending: text }).strict(),
    physics: z
      .object({
        speed: z.number().min(100).max(500),
        jump: z.number().min(200).max(1200),
        gravity: z.number().min(500).max(3000),
        airJumps: z.number().int().min(0).max(2).optional(),
        health: z.number().int().min(1).max(10),
      })
      .strict(),
    sounds: z
      .object({
        music: assetUrl,
        jump: assetUrl,
        hit: assetUrl,
        win: assetUrl,
        volume: z.number().min(0).max(1),
      })
      .strict(),
    animation: animationSchema,
  })
  .strict()
  .superRefine((g, ctx) => {
    if (g.characters.filter((c) => c.role === 'hero').length !== 1)
      ctx.addIssue({ code: 'custom', path: ['characters'], message: 'Choose exactly one hero' });
    for (const [key, items] of [
      ['characters', g.characters],
      ['levels', g.levels],
    ] as const)
      if (new Set(items.map((i) => i.id)).size !== items.length)
        ctx.addIssue({ code: 'custom', path: [key], message: 'IDs must be unique' });
    g.levels.forEach((l, i) => {
      if (
        l.boss?.characterId &&
        !g.characters.some((c) => c.id === l.boss?.characterId && c.role === 'enemy')
      )
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i, 'boss'],
          message: 'Boss must reference an enemy character',
        });
      if (l.holes?.some((h) => h.x < 200 || h.x + h.width > l.width - 180))
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i, 'holes'],
          message: 'Leave safe ground at the start and exit',
        });
      if (new Set(l.platforms.map((p) => p.id)).size !== l.platforms.length)
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i],
          message: 'Platform IDs must be unique',
        });
      if (l.platforms.some((p) => p.x + p.width > l.width))
        ctx.addIssue({
          code: 'custom',
          path: ['levels', i, 'platforms'],
          message: 'Platforms must fit within the level',
        });
    });
  });
export type Game = z.infer<typeof gameSchema>;
export type Level = Game['levels'][number];
export type Character = Game['characters'][number];
export type Project = {
  id: string;
  game: Game;
  revision: number;
  updatedAt: string;
  publishedId: string | null;
  slug?: string | null;
};
export const proposalSchema = z
  .object({
    summary: z.string().max(500),
    changes: z
      .array(
        z
          .object({
            path: z.string().max(160),
            value: z.union([z.string().max(2000), z.number(), z.boolean()]),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;
export function applyProposal(game: Game, raw: unknown): Game {
  const proposal = proposalSchema.parse(raw),
    next = structuredClone(game);
  const allowed =
    /^(title|description|recipient|story\.(opening|ending)|physics\.(speed|jump|gravity|health)|animation\.(preset|speed|squash|fps)|sounds\.volume|characters\.\d+\.(name|color|scale)|levels\.\d+\.(name|theme|enemyCount|intro|outro)|levels\.\d+\.platforms\.\d+\.(x|y|width|motion))$/;
  for (const change of proposal.changes) {
    if (!allowed.test(change.path)) throw new Error(`Editing ${change.path} is not allowed`);
    const keys = change.path.split('.');
    let target: any = next;
    for (const k of keys.slice(0, -1)) {
      if (!Object.hasOwn(target, k)) throw new Error('Unknown property');
      target = target[k];
    }
    const k = keys.at(-1)!;
    if (!Object.hasOwn(target, k)) throw new Error('Unknown property');
    target[k] = change.value;
  }
  return gameSchema.parse(next);
}

/** Only explicit media slots count as assets; narrative text never grants access. */
export function assetReferences(game: Game): { url: string; kind: 'image' | 'audio' }[] {
  return [
    ...game.characters.flatMap((c) =>
      [c.sprite, ...(c.frames || [])].map((url) => ({ url, kind: 'image' as const })),
    ),
    ...game.levels.map((l) => ({ url: l.background || '', kind: 'image' as const })),
    ...game.animation.frames.map((url) => ({ url, kind: 'image' as const })),
    ...(['music', 'jump', 'hit', 'win'] as const).map((k) => ({
      url: game.sounds[k],
      kind: 'audio' as const,
    })),
  ].filter((a) => a.url);
}
