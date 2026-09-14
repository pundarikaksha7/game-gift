import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import {
  avatarCatalog,
  avatarPresets,
  defaultAvatar,
  resolveAvatarLayers,
  type AvatarConfig,
} from '../shared/avatar';

const source = resolve(process.argv[2] || 'assets-source/kenney/modular-characters/PNG');
const output = resolve(process.argv[3] || 'public/avatars');
if (!existsSync(join(source, 'Skin')) || !existsSync(join(source, 'Hair')))
  throw new Error(`Expected the extracted Kenney PNG directory at ${source}`);

rmSync(output, { recursive: true, force: true });
for (const folder of [
  'base',
  'hair',
  'eyes',
  'mouth',
  'tops',
  'bottoms',
  'shoes',
  'presets',
  'thumbnails',
])
  mkdirSync(join(output, folder), { recursive: true });

function copy(from: string, to: string) {
  const target = join(output, to);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join(source, from), target);
}

for (let tint = 1; tint <= 8; tint++)
  for (const part of ['head', 'neck', 'arm', 'hand', 'leg'])
    copy(`Skin/Tint ${tint}/tint${tint}_${part}.png`, `base/skin-${tint}-${part}.png`);

const hairColors = {
  black: ['Black', 'black'],
  brown: ['Brown 1', 'brown1'],
  chestnut: ['Brown 2', 'brown2'],
  blonde: ['Blonde', 'blonde'],
  red: ['Red', 'red'],
  silver: ['Grey', 'grey'],
} as const;
for (const [, [folder, prefix]] of Object.entries(hairColors)) {
  for (let style = 1; style <= 12; style++) {
    const original = style <= 8 ? `${prefix}Man${style}.png` : `${prefix}Woman${style - 8}.png`;
    copy(`Hair/${folder}/${original}`, `hair/${prefix}-${style}.png`);
  }
}

const eyes = {
  'bright-black': 'eyeBlack_large.png',
  'bright-blue': 'eyeBlue_large.png',
  'bright-brown': 'eyeBrown_large.png',
  'bright-green': 'eyeGreen_large.png',
  'soft-pine': 'eyePine_small.png',
};
for (const [id, file] of Object.entries(eyes)) {
  const iris = await sharp(join(source, `Face/Eyes/${file}`))
    .resize(7, 7)
    .png()
    .toBuffer();
  const eye = await sharp({
    create: { width: 22, height: 16, channels: 4, background: '#00000000' },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="22" height="16"><ellipse cx="11" cy="8" rx="9.5" ry="6.5" fill="white" stroke="#493b3a" stroke-width="1.5"/></svg>',
        ),
      },
      { input: iris, left: 8, top: 5 },
    ])
    .png()
    .toBuffer();
  writeFileSync(join(output, `eyes/${id}.png`), eye);
}
const mouths = {
  glad: 'mouth_glad.png',
  happy: 'mouth_happy.png',
  oh: 'mouth_oh.png',
  straight: 'mouth_straight.png',
  teeth: 'mouth_teethUpper.png',
};
for (const [id, file] of Object.entries(mouths)) copy(`Face/Mouth/${file}`, `mouth/${id}.png`);

const tops = {
  blue: ['Blue', 'blue'],
  green: ['Green', 'green'],
  white: ['White', 'white'],
  navy: ['Navy', 'navy'],
  pine: ['Pine', 'pine'],
  red: ['Red', 'red'],
  yellow: ['Yellow', 'yellow'],
  grey: ['Grey', 'grey'],
} as const;
for (const [id, [folder, prefix]] of Object.entries(tops)) {
  const shirtPrefix =
    id === 'yellow' ? 'shirtYellow' : id === 'white' ? 'whiteShirt' : `${prefix}Shirt`;
  const armPrefix = id === 'white' ? 'armWhite' : id === 'yellow' ? 'armYellow' : `${prefix}Arm`;
  copy(`Shirts/${folder}/${shirtPrefix}1.png`, `tops/${id}-shirt.png`);
  copy(`Shirts/${folder}/${armPrefix}_long.png`, `tops/${id}-arm.png`);
}

const bottoms = {
  blue1: ['Blue 1', 'pantsBlue1'],
  blue2: ['Blue 2', 'pantsBlue2'],
  brown: ['Brown', 'pantsBrown'],
  green: ['Green', 'pantsGreen'],
  grey: ['Grey', 'pantsGrey'],
  navy: ['Navy', 'pantsNavy'],
  red: ['Red', 'pantsRed'],
  tan: ['Tan', 'pantsTan'],
} as const;
for (const [id, [folder, prefix]] of Object.entries(bottoms)) {
  copy(`Pants/${folder}/${prefix}3.png`, `bottoms/${id}-waist.png`);
  copy(`Pants/${folder}/${prefix}_long.png`, `bottoms/${id}-leg.png`);
}

const shoes = {
  black: ['Black', 'blackShoe5.png'],
  blue: ['Blue', 'blueShoe5.png'],
  brown1: ['Brown 1', 'brownShoe5.png'],
  grey: ['Grey', 'greyShoe5.png'],
  red: ['Red', 'redShoe5.png'],
  tan: ['Tan', 'tanShoe5.png'],
} as const;
for (const [id, [folder, file]] of Object.entries(shoes))
  copy(`Shoes/${folder}/${file}`, `shoes/${id}.png`);

const manifest = {
  version: 1,
  canvas: { width: 260, height: 350 },
  source: {
    pack: 'Kenney Modular Characters',
    license: 'CC0 1.0',
    url: 'https://kenney.nl/assets/modular-characters',
  },
  categories: Object.fromEntries(
    Object.entries(avatarCatalog).map(([key, ids]) => [
      key,
      ids.map((id) => ({ id, label: id.replaceAll('-', ' ') })),
    ]),
  ),
  presets: avatarPresets,
};
writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(output, 'presets/presets.json'), JSON.stringify(avatarPresets, null, 2) + '\n');

async function thumbnail(config: AvatarConfig, target: string) {
  mkdirSync(dirname(join(output, target)), { recursive: true });
  const layers = await Promise.all(
    resolveAvatarLayers(config).map(async (layer) => {
      let image = sharp(join(output, layer.src.replace('/avatars/', '')));
      if (layer.width) image = image.resize({ width: layer.width });
      if (layer.flipX) image = image.flop();
      return { input: await image.png().toBuffer(), left: layer.x, top: layer.y };
    }),
  );
  const full = await sharp({
    create: { width: 800, height: 800, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  await sharp(full)
    .extract({ left: 0, top: 0, width: 260, height: 350 })
    .resize({ width: 104, height: 140, fit: 'contain' })
    .webp({ quality: 82, effort: 5 })
    .toFile(join(output, target));
}

for (const [index, preset] of avatarPresets.entries())
  await thumbnail(preset, `thumbnails/presets/preset-${String(index + 1).padStart(2, '0')}.webp`);
for (const category of [
  'skinTone',
  'hair',
  'hairColor',
  'eyes',
  'mouth',
  'top',
  'bottom',
  'shoes',
] as const)
  for (const id of avatarCatalog[category])
    await thumbnail(
      { ...defaultAvatar, [category]: id, preset: undefined },
      `thumbnails/${category}/${id}.webp`,
    );

const license = resolve(source, '../../license.txt');
if (existsSync(license)) writeFileSync(join(output, 'KENNEY-CC0.txt'), readFileSync(license));
console.log(
  `Imported ${Object.values(avatarCatalog).reduce((n, values) => n + values.length, 0)} stable avatar options into ${output}`,
);
