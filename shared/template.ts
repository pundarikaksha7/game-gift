import type { Game, Level } from './schema';
import { avatarPresets, defaultAvatar } from './avatar';

export type DifficultyMode = 'easy' | 'difficult' | 'hard';
export const difficultyPresets = {
  easy: {
    enemyCount: 3,
    enemyIq: 'low',
    pitCount: 1,
    boss: false,
    enemyHealth: 1,
    enemyDamage: 1,
    enemySpeed: 1,
    enemyAttackRate: 1,
  },
  difficult: {
    enemyCount: 7,
    enemyIq: 'high',
    pitCount: 3,
    boss: false,
    enemyHealth: 1.3,
    enemyDamage: 1.25,
    enemySpeed: 1.18,
    enemyAttackRate: 1.2,
  },
  hard: {
    enemyCount: 12,
    enemyIq: 'high',
    pitCount: 5,
    boss: true,
    enemyHealth: 1.65,
    enemyDamage: 1.5,
    enemySpeed: 1.3,
    enemyAttackRate: 1.4,
  },
} as const satisfies Record<
  DifficultyMode,
  {
    enemyCount: number;
    enemyIq: 'low' | 'high';
    pitCount: number;
    boss: boolean;
    enemyHealth: number;
    enemyDamage: number;
    enemySpeed: number;
    enemyAttackRate: number;
  }
>;

export function applyDifficultyPreset(level: Level, mode: DifficultyMode, enemyId?: string) {
  const preset = difficultyPresets[mode];
  level.difficulty = mode;
  level.enemyCount = preset.enemyCount;
  level.enemyIq = preset.enemyIq;
  level.requireDefeatAll = mode !== 'easy';
  level.powerup = mode === 'hard' ? 'mixed' : mode === 'difficult' ? 'boost' : 'companion';
  level.holes = Array.from({ length: preset.pitCount }, (_, index) => ({
    x: Math.round(520 + ((level.width - 1040) * (index + 1)) / (preset.pitCount + 1)),
    width: mode === 'easy' ? 90 : mode === 'difficult' ? 125 : 155,
  }));
  level.boss = {
    ...{
      enabled: false,
      name: 'Guardian',
      health: 240,
      damage: 1,
      enrageAt: 0.5,
      armor: 0.45,
    },
    ...level.boss,
    enabled: preset.boss && !!enemyId,
    characterId: enemyId || level.boss?.characterId,
  };
}
export function newLevel(index: number): Level {
  return {
    id: crypto.randomUUID(),
    name: ['The beginning', 'Golden hour', 'Under the stars'][index] || `Chapter ${index + 1}`,
    theme: index % 3 === 0 ? 'meadow' : index % 3 === 1 ? 'sunset' : 'midnight',
    width: 2800,
    enemyCount: 3,
    enemyIq: 'low',
    difficulty: 'easy',
    platforms: [
      { id: 'p1', x: 360, y: 355, width: 190, motion: 'none' },
      { id: 'p2', x: 680, y: 285, width: 180, motion: 'vertical' },
      { id: 'p3', x: 1040, y: 350, width: 220, motion: 'none' },
      { id: 'p4', x: 1500, y: 290, width: 200, motion: 'horizontal' },
      { id: 'p5', x: 1980, y: 340, width: 200, motion: 'none' },
    ],
    intro: 'Every great adventure starts with a little courage.',
    outro: 'Chapter complete. Continue to the next world.',
  };
}
export function createTemplate(): Game {
  return {
    schemaVersion: 1,
    engine: 'adventure',
    title: 'Untitled experience',
    description:
      'An interactive adventure. Customize the world, cast, and story, then publish a playable link.',
    recipient: '',
    characters: [
      {
        id: 'hero',
        name: 'Explorer',
        role: 'hero',
        sprite: '',
        color: '#a7b78f',
        scale: 1,
        avatar: structuredClone(defaultAvatar),
      },
      {
        id: 'friend',
        name: 'Companion',
        role: 'friend',
        sprite: '',
        color: '#e8b69e',
        scale: 1,
        avatar: structuredClone(avatarPresets[1]),
      },
      {
        id: 'enemy',
        name: 'Scout',
        role: 'enemy',
        sprite: '',
        color: '#b6add3',
        scale: 1,
        avatar: structuredClone(avatarPresets[3]),
      },
    ],
    levels: [newLevel(0), newLevel(1), newLevel(2)],
    story: {
      opening: 'Welcome, explorer. Follow the platforms, discover the world, and reach the portal.',
      ending: 'You made it! Thanks for playing.',
    },
    physics: { speed: 270, jump: 590, gravity: 1500, health: 5 },
    sounds: {
      music: '',
      jump: '',
      hit: '',
      punch: '',
      kick: '',
      heroAttack: '',
      villainAttack: '',
      win: '',
      volume: 0.45,
    },
    animation: { preset: 'bounce', speed: 1, squash: 0.08, frames: [], fps: 8 },
  };
}

export const starters = [
  {
    id: 'adventure',
    name: 'World explorer',
    description: 'Three open worlds with platforms, rivals, and a story.',
    theme: 'meadow',
    tag: 'Adventure',
  },
  {
    id: 'story',
    name: 'Story journey',
    description: 'A relaxed, combat-free experience built around your message.',
    theme: 'sunset',
    tag: 'Story',
  },
  {
    id: 'arcade',
    name: 'Arcade challenge',
    description: 'Fast movement, tougher encounters, and a final guardian.',
    theme: 'midnight',
    tag: 'Arcade',
  },
] as const;
export type StarterId = (typeof starters)[number]['id'];
export function createStarter(id: StarterId): Game {
  const game = createTemplate();
  game.title = starters.find((s) => s.id === id)!.name;
  if (id === 'story') {
    game.characters = game.characters.filter((c) => c.role !== 'enemy');
    game.physics = { speed: 220, jump: 650, gravity: 1200, health: 8, airJumps: 1 };
    game.levels.forEach((l, i) => {
      l.theme = 'sunset';
      l.enemyCount = 0;
      l.name = `Scene ${i + 1}`;
    });
  }
  if (id === 'arcade') {
    game.physics = { speed: 380, jump: 850, gravity: 1800, health: 5, airJumps: 1 };
    game.levels.forEach((l) => {
      l.theme = 'midnight';
      l.enemyCount = 5;
      l.requireDefeatAll = true;
      l.powerup = 'mixed';
    });
    game.levels[2].boss = {
      enabled: true,
      characterId: 'enemy',
      name: 'Guardian',
      health: 150,
      damage: 1,
      enrageAt: 0.4,
      armor: 0.6,
    };
  }
  return game;
}
