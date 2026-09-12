import { useEffect, useRef } from 'react';
import type { Game } from '../../shared/schema';
import { drawWorld, drawCharacter } from '../engine/renderer';
import { stepBody, overlaps, type Body } from '../engine/physics';
import { GameAudio } from '../engine/audio';
export function GameCanvas({
  game,
  levelIndex = 0,
  playing = false,
  grid = false,
  camera = 0,
  onEnd,
  onPlatform,
  controls,
}: {
  game: Game;
  levelIndex?: number;
  playing?: boolean;
  grid?: boolean;
  camera?: number;
  onEnd?: (result: 'win' | 'lose') => void;
  onPlatform?: (x: number, y: number) => void;
  controls?: React.RefObject<Set<string>>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext('2d')!;
    const level = game.levels[levelIndex] || game.levels[0];
    const hero = game.characters.find((c) => c.role === 'hero')!;
    const enemyTypes = game.characters.filter((c) => c.role === 'enemy');
    const friends = game.characters.filter((c) => c.role === 'friend');
    let elapsed = 0,
      last = 0,
      frame = 0,
      acc = 0,
      finished = false,
      facing = 1,
      health = game.physics.health,
      hurt = 0,
      attack = 0,
      jumps = 0,
      jumpHeld = false;
    let cam = camera;
    const keys = new Set<string>(),
      images = new Map<string, HTMLImageElement>();
    for (const url of [
      ...game.characters.map((c) => c.sprite),
      ...game.animation.frames,
      level.background || '',
    ])
      if (url && !images.has(url)) {
        const img = new Image();
        img.src = url;
        images.set(url, img);
      }
    const player: Body = { x: 120, y: 380, vx: 0, vy: 0, w: 34, h: 62, grounded: false };
    const enemies = Array.from({ length: enemyTypes.length ? level.enemyCount : 0 }, (_, i) => ({
      character: enemyTypes[i % enemyTypes.length],
      x: 720 + (i * (level.width - 900)) / Math.max(level.enemyCount, 1),
      y: 410,
      vx: 0,
      vy: 0,
      w: 35,
      h: 48,
      grounded: false,
      alive: true,
    }));
    const sound = new GameAudio(game.sounds);
    if (playing) sound.start();
    const down = (e: KeyboardEvent) => {
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'Space',
          'KeyA',
          'KeyD',
          'KeyW',
          'KeyJ',
          'KeyK',
        ].includes(e.code)
      ) {
        e.preventDefault();
        keys.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => {
      keys.clear();
      controls?.current.clear();
    };
    if (playing) {
      window.addEventListener('keydown', down);
      window.addEventListener('keyup', up);
      window.addEventListener('blur', blur);
    }
    const pressed = (...codes: string[]) =>
      codes.some((c) => keys.has(c) || controls?.current.has(c));
    function tick(dt: number) {
      elapsed += dt;
      if (!playing || finished) return;
      hurt = Math.max(0, hurt - dt);
      attack = Math.max(0, attack - dt);
      player.vx =
        (Number(pressed('ArrowRight', 'KeyD')) - Number(pressed('ArrowLeft', 'KeyA'))) *
        game.physics.speed;
      if (player.vx) facing = Math.sign(player.vx);
      const jump = pressed('Space', 'ArrowUp', 'KeyW');
      if (player.grounded) jumps = 0;
      if (jump && !jumpHeld && (player.grounded || jumps < (game.physics.airJumps || 0))) {
        if (!player.grounded) jumps++;
        player.vy = -game.physics.jump;
        sound.play('jump');
      }
      jumpHeld = jump;
      const strike = pressed('KeyJ', 'KeyK') && attack === 0;
      if (strike) {
        attack = 0.35;
        sound.play('hit');
      }
      stepBody(player, dt, game.physics.gravity, level, elapsed);
      for (const e of enemies) {
        if (!e.alive) continue;
        e.vx =
          Math.abs(player.x - e.x) < 400 ? Math.sign(player.x - e.x) * 75 : Math.sin(elapsed) * 25;
        stepBody(e, dt, game.physics.gravity, level, elapsed);
        if (
          (strike && Math.abs(player.x - e.x) < 90 && Math.abs(player.y - e.y) < 80) ||
          (overlaps(player, e) && player.vy > 100 && player.y + player.h < e.y + 25)
        ) {
          e.alive = false;
          player.vy = -200;
        } else if (overlaps(player, e) && hurt === 0) {
          health--;
          hurt = 1.2;
          sound.play('hit');
        }
      }
      if (health <= 0) {
        finished = true;
        end.current?.('lose');
      }
      if (player.x >= level.width - 140) {
        finished = true;
        sound.play('win');
        end.current?.('win');
      }
      cam = Math.max(0, Math.min(level.width - 960, player.x - 320));
    }
    function draw(timestamp: number) {
      const delta = last ? Math.min((timestamp - last) / 1000, 0.05) : 0;
      last = timestamp;
      acc += delta;
      while (acc >= 1 / 60) {
        tick(1 / 60);
        acc -= 1 / 60;
      }
      drawWorld(ctx, level, cam, elapsed, grid, images.get(level.background || ''));
      friends.forEach((friend, i) =>
        drawCharacter(
          ctx,
          friend,
          { ...player, x: level.width - 200 - i * 100, y: 398 },
          cam,
          elapsed,
          game,
          images,
        ),
      );
      for (const e of enemies)
        if (e.alive)
          drawCharacter(ctx, e.character, e, cam, elapsed, game, images, e.vx >= 0 ? 1 : -1);
      if (hurt === 0 || Math.floor(elapsed * 12) % 2 === 0)
        drawCharacter(ctx, hero, player, cam, elapsed, game, images, facing);
      if (attack > 0.2) {
        ctx.strokeStyle = '#fff4c4';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(player.x - cam + 17 + facing * 28, player.y + 25, 25, -1.4, 1.4);
        ctx.stroke();
      }
      if (playing) {
        ctx.fillStyle = '#263c32dc';
        ctx.beginPath();
        ctx.roundRect(22, 20, 210, 67, 12);
        ctx.fill();
        ctx.font = '600 14px system-ui';
        ctx.fillStyle = '#fff';
        ctx.fillText(level.name, 38, 44);
        ctx.fillStyle = '#f2b6aa';
        ctx.fillText('♥ '.repeat(Math.max(0, health)), 38, 68);
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      sound.dispose();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      controls?.current.clear();
    };
  }, [game, levelIndex, playing, grid, camera, controls]);
  return (
    <canvas
      ref={ref}
      width={960}
      height={540}
      aria-label={`${game.title} game ${playing ? 'playtest' : 'preview'}`}
      onClick={(e) => {
        if (onPlatform) {
          const r = e.currentTarget.getBoundingClientRect();
          onPlatform(
            ((e.clientX - r.left) / r.width) * 960 + camera,
            ((e.clientY - r.top) / r.height) * 540,
          );
        }
      }}
    />
  );
}
