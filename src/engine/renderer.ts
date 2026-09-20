import type { Game, Level, Character } from '../../shared/schema';
import { platformsAt, type Body } from './physics';
export const palettes = {
  meadow: {
    sky: '#dfe9e0',
    far: '#bacdba',
    hill: '#9ab596',
    ground: '#688365',
    top: '#9bb487',
    accent: '#f7e6ac',
  },
  sunset: {
    sky: '#f3ddd0',
    far: '#dfb8a1',
    hill: '#c39b89',
    ground: '#937967',
    top: '#c4ad88',
    accent: '#fff0b4',
  },
  midnight: {
    sky: '#343b58',
    far: '#505b76',
    hill: '#64748b',
    ground: '#3b5055',
    top: '#85a39c',
    accent: '#e9ddb2',
  },
};
export function drawWorld(
  ctx: CanvasRenderingContext2D,
  level: Level,
  camera: number,
  time: number,
  grid = false,
  background?: HTMLImageElement,
) {
  const p = palettes[level.theme];
  ctx.fillStyle = p.sky;
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.arc(758 - camera * 0.04, 92, 37, 0, Math.PI * 2);
  ctx.fill();
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer ? p.hill : p.far;
    ctx.beginPath();
    ctx.moveTo(0, 460);
    for (let x = 0; x <= 970; x += 10) {
      const wx = x + camera * (layer ? 0.25 : 0.12);
      ctx.lineTo(
        x,
        340 + layer * 40 - Math.sin(wx * 0.006 + layer * 3) * 49 - Math.sin(wx * 0.012) * 18,
      );
    }
    ctx.lineTo(960, 540);
    ctx.lineTo(0, 540);
    ctx.fill();
  }
  ctx.fillStyle = level.theme === 'midnight' ? '#ffffff40' : '#ffffff9c';
  for (let i = 0; i < 5; i++) {
    let x = ((((i * 240 - camera * 0.08) % 1200) + 1200) % 1200) - 100;
    ctx.beginPath();
    ctx.ellipse(x, 100 + (i % 3) * 40, 50, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 10, 90 + (i % 3) * 40, 25, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < Math.ceil(level.width / 330); i++) {
    let x = i * 330 + 190 - camera;
    ctx.fillStyle = p.ground;
    ctx.fillRect(x, 360, 13, 100);
    ctx.fillStyle = p.hill;
    ctx.beginPath();
    ctx.moveTo(x - 45, 385);
    ctx.lineTo(x + 7, 285);
    ctx.lineTo(x + 55, 385);
    ctx.fill();
    ctx.fillStyle = p.top;
    ctx.beginPath();
    ctx.moveTo(x - 37, 352);
    ctx.lineTo(x + 7, 272);
    ctx.lineTo(x + 45, 352);
    ctx.fill();
  }
  if (background?.complete && background.naturalWidth) {
    const scale = Math.max(960 / background.naturalWidth, 460 / background.naturalHeight);
    const w = background.naturalWidth * scale,
      h = background.naturalHeight * scale;
    ctx.drawImage(background, (960 - w) / 2, (460 - h) / 2, w, h);
  }
  for (const plat of platformsAt(level, time)) {
    ctx.fillStyle = p.ground;
    ctx.beginPath();
    ctx.roundRect(
      plat.x - camera,
      plat.y,
      plat.width,
      plat.id === 'ground' ? 90 : 22,
      plat.id === 'ground' ? 0 : 5,
    );
    ctx.fill();
    ctx.fillStyle = p.top;
    ctx.fillRect(plat.x - camera, plat.y, plat.width, 6);
    if (plat.id !== 'ground') {
      ctx.fillStyle = '#ffffff24';
      for (let x = plat.x + 12; x < plat.x + plat.width - 5; x += 23)
        ctx.fillRect(x - camera, plat.y + 12, 8, 3);
    }
  }
  for (let i = 0; i < level.width / 45; i++) {
    const x = i * 45 - camera;
    ctx.fillStyle = i % 3 ? '#e4d5b0' : '#f7ede0';
    ctx.beginPath();
    ctx.arc(x, 454 - (i % 3) * 2, 2.5, 0, 7);
    ctx.fill();
  }
  const goal = level.width - 100 - camera;
  ctx.fillStyle = p.ground;
  ctx.fillRect(goal, 345, 5, 115);
  ctx.fillStyle = '#eeaf87';
  ctx.beginPath();
  ctx.moveTo(goal + 5, 345);
  ctx.lineTo(goal + 55, 359);
  ctx.lineTo(goal + 5, 379);
  ctx.fill();
  if (grid) {
    ctx.strokeStyle = '#ffffff30';
    ctx.lineWidth = 0.5;
    for (let x = -camera % 40; x < 960; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 540);
      ctx.stroke();
    }
    for (let y = 0; y < 540; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(960, y);
      ctx.stroke();
    }
  }
}
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  c: Character,
  body: Body,
  camera: number,
  time: number,
  game: Game,
  images: Map<string, HTMLImageElement>,
  facing = 1,
) {
  const a = game.animation;
  const wave = Math.sin(time * 7 * a.speed);
  const offset = a.preset === 'float' ? wave * 5 : a.preset === 'bounce' ? Math.abs(wave) * -3 : 0;
  const squash = a.preset === 'none' ? 0 : wave * a.squash;
  const frames = c.role === 'hero' ? a.frames : [];
  const url = frames.length ? frames[Math.floor(time * a.fps) % frames.length] : c.sprite;
  const img = images.get(url);
  ctx.save();
  ctx.translate(body.x - camera + body.w / 2, body.y + body.h + offset);
  // A restrained contact shadow keeps light or transparent sprites readable on custom scenery.
  ctx.fillStyle = 'rgba(24, 28, 38, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 2, Math.max(15, body.w * c.scale * 0.58), 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(facing * (1 + squash) * c.scale, (1 - squash) * c.scale);
  if (img?.complete && img.naturalWidth) {
    const h = body.h + 18,
      w = (h * img.naturalWidth) / img.naturalHeight;
    ctx.shadowColor = 'rgba(22, 25, 35, 0.32)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(img, -w / 2, -h, w, h);
  } else {
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(-body.w / 2, -body.h, body.w, body.h, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(1, -body.h + 13, 7, 9);
    ctx.fillStyle = '#243a32';
    ctx.fillRect(5, -body.h + 16, 3, 5);
  }
  ctx.restore();
}
