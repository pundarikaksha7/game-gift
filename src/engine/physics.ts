import type { Level } from '../../shared/schema';
export type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  grounded: boolean;
  supportId?: string;
};
export function platformsAt(level: Level, time: number) {
  return [
    { id: 'ground', x: 0, y: 460, width: level.width, motion: 'none' },
    ...level.platforms.map((p) => ({
      ...p,
      x: p.x + (p.motion === 'horizontal' ? Math.sin(time * 1.4) * 45 : 0),
      y: p.y + (p.motion === 'vertical' ? Math.sin(time * 1.4) * 35 : 0),
    })),
  ];
}
export function stepBody(body: Body, dt: number, gravity: number, level: Level, time: number) {
  const platforms = platformsAt(level, time);
  if (body.grounded && body.supportId && body.vy >= 0) {
    const before = platformsAt(level, time - dt).find((p) => p.id === body.supportId),
      now = platforms.find((p) => p.id === body.supportId);
    if (before && now) {
      body.x += now.x - before.x;
      body.y += now.y - before.y;
    }
  }
  const feet = body.y + body.h;
  body.supportId = undefined;
  body.vy += gravity * dt;
  body.x = Math.max(0, Math.min(level.width - body.w, body.x + body.vx * dt));
  body.y += body.vy * dt;
  body.grounded = false;
  for (const p of platforms) {
    if (
      body.x + body.w > p.x &&
      body.x < p.x + p.width &&
      body.vy >= 0 &&
      feet <= p.y + 4 &&
      body.y + body.h >= p.y
    ) {
      body.y = p.y - body.h;
      body.vy = 0;
      body.grounded = true;
      body.supportId = p.id;
    }
  }
}
export function overlaps(a: Body, b: Body) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
