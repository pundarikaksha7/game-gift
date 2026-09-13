import { mechanicsSchema, type Game } from './schema';
export const WORLD_UNIT = 460 / 1080;
export const defaultBoss = {
  enabled: false,
  name: 'Guardian',
  health: 240,
  damage: 1,
  enrageAt: 0.5,
  armor: 0.45,
};
/** Declarative adapter: the editor owns validated data; the runtime owns transient state. */
export function runtimeConfig(game: Game, startLevel = 0, camera = 0) {
  const mechanics = mechanicsSchema.parse(game.mechanics || {});
  const enemies = game.characters.filter((c) => c.role === 'enemy');
  const hero = game.characters.find((c) => c.role === 'hero')!;
  const assets: Record<string, string> = { player_character: hero.sprite };
  game.characters.forEach((c) => (assets[c.id] = c.sprite));
  game.levels.forEach((l) => (assets[l.id] = l.background || ''));
  const enemyTypes = Object.fromEntries(
    enemies.map((c) => {
      const size = c.archetype || 'small',
        i = ['small', 'medium', 'large'].indexOf(size);
      return [
        c.id,
        {
          name: c.name,
          w: [48, 58, 62][i],
          h: [92, 102, 116][i] * c.scale,
          healthKey: c.id + 'Health',
          damageKey: c.id + 'Damage',
          speedScale: (c.moveSpeed || [141.6, 120, 91.2][i]) / 120,
          attackDamage: c.damage || [0.35, 0.5, 0.75][i],
          attackCooldown: c.attackCooldown || [0.95, 1.08, 1.3][i],
          color: c.color,
          archetype: size,
        },
      ];
    }),
  );
  const enemyStats: Record<string, number> = {
    speed: 120,
    aggressionRange: mechanics.aggressionRange,
  };
  enemies.forEach((c) => {
    enemyStats[c.id + 'Health'] =
      c.health || { small: 28, medium: 52, large: 88 }[c.archetype || 'small'];
    enemyStats[c.id + 'Damage'] = c.damage || 0.35;
  });
  return {
    title: game.title,
    startLevel,
    camera: camera / WORLD_UNIT,
    assets,
    enemyTypes,
    enemies: enemyStats,
    mechanics,
    player: {
      startX: 224,
      startY: 968,
      moveSpeed: game.physics.speed / WORLD_UNIT,
      jumpForce: game.physics.jump / WORLD_UNIT,
      maxHealth: game.physics.health,
      invincibilityDuration: mechanics.invincibility,
      airJumps: game.physics.airJumps || 0,
      scale: hero.scale,
    },
    physics: { gravity: game.physics.gravity / WORLD_UNIT },
    level: { groundY: 1080 },
    combat: mechanics,
    hazards: { fallDamage: mechanics.fallDamage },
    animation: game.animation,
    characters: game.characters,
    helpers: game.characters
      .filter((c) => c.role === 'friend')
      .map((c) => ({
        id: c.id,
        name: c.name,
        size: c.archetype === 'large' ? 'big' : 'small',
        damage: c.damage || (c.archetype === 'large' ? 10 : 6),
        range: c.helperRange || (c.archetype === 'large' ? 140 : 380),
        cooldown: c.attackCooldown || (c.archetype === 'large' ? 1.1 : 0.85),
        scale: c.scale,
      })),
    levels: game.levels.map((l) => ({
      ...l,
      width: l.width / WORLD_UNIT,
      groundY: 1080,
      startY: 968,
      skyColor: l.theme === 'midnight' ? '#241b42' : l.theme === 'sunset' ? '#e5bbaa' : '#87CEEB',
      groundColor:
        l.theme === 'midnight' ? '#35374e' : l.theme === 'sunset' ? '#8c8589' : '#618b7a',
      boss: { ...defaultBoss, ...l.boss, enabled: !!l.boss?.enabled && enemies.length > 0 },
      requireDefeatAll: l.requireDefeatAll ?? false,
      powerup: l.powerup || 'none',
      holes: (l.holes || []).map((h) => ({ x: h.x / WORLD_UNIT, w: h.width / WORLD_UNIT })),
      platforms: l.platforms.map((p) => ({
        x: p.x / WORLD_UNIT,
        y: p.y / WORLD_UNIT,
        w: p.width / WORLD_UNIT,
        h: 24,
        motion: {
          axis: p.motion,
          amplitude: (p.amplitude ?? 24) / WORLD_UNIT,
          period: p.period || 3.5,
        },
      })),
    })),
    sounds: {
      punch: game.sounds.hit,
      kick: game.sounds.hit,
      hurt: game.sounds.hit,
      defeat: game.sounds.hit,
      jump: game.sounds.jump,
      win: game.sounds.win,
      music: game.sounds.music,
    },
    audio: { sfxVolume: game.sounds.volume, musicVolume: game.sounds.volume },
  };
}
