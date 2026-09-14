import {
  avatarCacheKey,
  resolveAvatarLayers,
  safeAvatar,
  type AvatarConfig,
} from '../../shared/avatar';

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const textureCache = new Map<string, Promise<string>>();

function loadImage(src: string) {
  let promise = imageCache.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Avatar layer failed to load: ${src}`));
      image.src = src;
    });
    imageCache.set(src, promise);
  }
  return promise;
}

/** Composes once per stable config and returns a game-ready single PNG texture. */
export function composeAvatar(raw: AvatarConfig): Promise<string> {
  const config = safeAvatar(raw),
    key = avatarCacheKey(config);
  let promise = textureCache.get(key);
  if (!promise) {
    promise = (async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 260;
      canvas.height = 350;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      for (const layer of resolveAvatarLayers(config)) {
        try {
          const image = await loadImage(layer.src);
          context.save();
          const width = layer.width || image.naturalWidth;
          if (layer.flipX) {
            context.translate(layer.x * 2 + width, 0);
            context.scale(-1, 1);
          }
          context.drawImage(
            image,
            layer.x,
            layer.y,
            width,
            layer.width
              ? (image.naturalHeight * layer.width) / image.naturalWidth
              : image.naturalHeight,
          );
          context.restore();
        } catch {
          // A missing optional layer never prevents the remaining avatar from rendering.
        }
      }
      return canvas.toDataURL('image/png');
    })();
    textureCache.set(key, promise);
  }
  return promise;
}

export function preloadAvatar(raw: AvatarConfig) {
  return Promise.allSettled(
    resolveAvatarLayers(safeAvatar(raw)).map((layer) => loadImage(layer.src)),
  );
}
