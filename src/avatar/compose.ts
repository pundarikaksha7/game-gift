import { resolveAvatarAsset, resolveAvatarFrames, safeAvatar, type AvatarConfig, type AvatarMotion } from '../../shared/avatar';

const loaded = new Map<string, Promise<string>>();
function preload(src: string): Promise<string> {
  let promise = loaded.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(src);
      image.onerror = () => reject(new Error(`Character sprite failed to load: ${src}`));
      image.src = src;
    });
    loaded.set(src, promise);
  }
  return promise;
}

export function composeAvatar(raw: AvatarConfig): Promise<string> {
  return preload(resolveAvatarAsset(safeAvatar(raw)));
}

export function avatarAnimation(raw: AvatarConfig, motion: AvatarMotion): string[] {
  return resolveAvatarFrames(safeAvatar(raw), motion);
}

export function preloadAvatar(raw: AvatarConfig) {
  const config = safeAvatar(raw);
  return Promise.allSettled([
    resolveAvatarAsset(config), ...resolveAvatarFrames(config, 'idle'),
    ...resolveAvatarFrames(config, 'run'), ...resolveAvatarFrames(config, 'jump'),
  ].map(preload));
}
