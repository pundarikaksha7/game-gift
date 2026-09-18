import { assetReferences, gameSchema, type Game } from './schema';

export const GAME_EXPORT_FORMAT = 'gamegift-bundle-v1' as const;

export type GameExportAsset = {
  mime: string;
  data: string;
};

export type GameExportBundle = {
  format: typeof GAME_EXPORT_FORMAT;
  exportedAt: string;
  game: Game;
  assets: Record<string, GameExportAsset>;
};

export function createGameExport(
  game: Game,
  assets: Record<string, GameExportAsset> = {},
): GameExportBundle {
  return {
    format: GAME_EXPORT_FORMAT,
    exportedAt: new Date().toISOString(),
    game: gameSchema.parse(game),
    assets,
  };
}

export function parseGameExport(value: unknown): {
  game: Game;
  assets: Record<string, GameExportAsset>;
} {
  if (!value || typeof value !== 'object' || (value as any).format !== GAME_EXPORT_FORMAT)
    return { game: gameSchema.parse(value), assets: {} };

  const raw = value as Record<string, unknown>;
  const game = gameSchema.parse(raw.game);
  if (!raw.assets || typeof raw.assets !== 'object' || Array.isArray(raw.assets))
    throw new Error('This game export has an invalid asset bundle');

  const assets: Record<string, GameExportAsset> = {};
  for (const [url, value] of Object.entries(raw.assets)) {
    if (!value || typeof value !== 'object') throw new Error('Invalid bundled asset');
    const mime = (value as any).mime;
    const data = (value as any).data;
    if (!/^\/api\/assets\/[a-f0-9-]{36}$/.test(url) && !/^blob:/i.test(url))
      throw new Error('Invalid bundled asset reference');
    if (typeof mime !== 'string' || !/^(?:image|audio)\/[a-z0-9.+-]+$/i.test(mime))
      throw new Error('Invalid bundled asset type');
    if (typeof data !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(data))
      throw new Error('Invalid bundled asset data');
    assets[url] = { mime, data };
  }
  return { game, assets };
}

function rewriteAssets(game: Game, mapped: Record<string, string>) {
  return JSON.parse(JSON.stringify(game), (_key, value) =>
    typeof value === 'string' && mapped[value] ? mapped[value] : value,
  ) as Game;
}

export function stripLocalAssets(game: Game): Game {
  const local = (url: string) => url.startsWith('blob:');
  const clean = structuredClone(game);
  clean.characters.forEach((character) => {
    if (local(character.sprite)) character.sprite = '';
    character.frames = character.frames?.filter((url) => !local(url));
  });
  clean.levels.forEach((level) => {
    if (level.background && local(level.background)) level.background = '';
    if (level.powerupArt && local(level.powerupArt)) level.powerupArt = '';
  });
  clean.animation.frames = clean.animation.frames.filter((url) => !local(url));
  for (const key of [
    'music',
    'jump',
    'hit',
    'win',
    'punch',
    'kick',
    'heroAttack',
    'villainAttack',
  ] as const) {
    const url = clean.sounds[key];
    if (url && local(url)) clean.sounds[key] = '';
  }
  return clean;
}

function bytesToBase64(bytes: Uint8Array) {
  let encoded = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize)
    encoded += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  return btoa(encoded);
}

function base64ToBlob(data: string, mime: string) {
  const decoded = atob(data);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

export async function exportLocalGame(game: Game) {
  const assets: Record<string, GameExportAsset> = {};
  for (const { url, kind } of assetReferences(game)) {
    if (!url.startsWith('blob:') || assets[url]) continue;
    const blob = await (await fetch(url)).blob();
    assets[url] = {
      mime: blob.type || (kind === 'audio' ? 'audio/mpeg' : 'image/png'),
      data: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
    };
  }
  return new Blob([`${JSON.stringify(createGameExport(game, assets), null, 2)}\n`], {
    type: 'application/vnd.gamegift+json',
  });
}

export function importGameExport(raw: unknown): Game {
  const { game, assets } = parseGameExport(raw);
  const mapped: Record<string, string> = {};
  for (const [url, asset] of Object.entries(assets))
    mapped[url] = URL.createObjectURL(base64ToBlob(asset.data, asset.mime));
  return rewriteAssets(game, mapped);
}
