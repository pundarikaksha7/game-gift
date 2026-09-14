import type { Game, Level } from './schema';
import { avatarPresets, defaultAvatar } from './avatar';
export function newLevel(index: number): Level {
  return {
    id: crypto.randomUUID(),
    name: ['The beginning', 'Golden hour', 'Under the stars'][index] || `Chapter ${index + 1}`,
    theme: index % 3 === 0 ? 'meadow' : index % 3 === 1 ? 'sunset' : 'midnight',
    width: 2800,
    enemyCount: 3,
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
    sounds: { music: '', jump: '', hit: '', win: '', volume: 0.45 },
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
