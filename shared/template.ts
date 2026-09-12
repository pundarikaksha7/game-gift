import type { Game, Level } from './schema';
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
    outro: 'Another memory, another step closer.',
  };
}
export function createTemplate(): Game {
  return {
    schemaVersion: 1,
    title: 'Your next adventure',
    description: 'A journey through the places, people, and little moments that make you, you.',
    recipient: 'Player',
    characters: [
      {
        id: 'hero',
        name: 'Player',
        role: 'hero',
        sprite: '/assets/hero.webp',
        color: '#a7b78f',
        scale: 1,
      },
      {
        id: 'friend',
        name: 'Your bestie',
        role: 'friend',
        sprite: '/assets/friend.webp',
        color: '#e8b69e',
        scale: 1,
      },
      {
        id: 'enemy',
        name: 'The troublemaker',
        role: 'enemy',
        sprite: '/assets/enemy.webp',
        color: '#b6add3',
        scale: 1,
      },
    ],
    levels: [newLevel(0), newLevel(1), newLevel(2)],
    story: {
      opening:
        'Some gifts fit in a box. This one is a whole little world. Ready for an adventure made just for you?',
      ending: 'Here’s to all the adventures still to come. Your next chapter awaits!',
    },
    physics: { speed: 270, jump: 590, gravity: 1500, health: 5 },
    sounds: { music: '', jump: '', hit: '', win: '', volume: 0.45 },
    animation: { preset: 'bounce', speed: 1, squash: 0.08, frames: [], fps: 8 },
  };
}

/** Upgrade untouched starter personalization when reopening an older draft. */
export function upgradeStarter(game: Game): Game {
  const recipient = game.recipient;
  if (
    !recipient ||
    game.title !== `${recipient}’s little adventure` ||
    game.story.ending !==
      `Here’s to all the adventures still to come. Happy birthday, ${recipient}! ♡`
  )
    return game;
  const next = structuredClone(game),
    template = createTemplate();
  next.title = template.title;
  next.recipient = template.recipient;
  next.story.ending = template.story.ending;
  for (const character of next.characters)
    if (character.role === 'hero' && character.name === recipient) character.name = 'Player';
  return next;
}
