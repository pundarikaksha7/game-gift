import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, requestHeaders, uploadAsset } from './api';
import { supabase } from './auth';
import type { Game } from '../shared/schema';
import { assetReferences } from '../shared/schema';
function isLocalAsset(url: string) {
  return url.startsWith('blob:');
}
function isBundledAsset(url: string) {
  return url.startsWith('/assets/');
}
function rewriteAssets(game: Game, mapped: Record<string, string>) {
  return JSON.parse(JSON.stringify(game), (_key, value) =>
    typeof value === 'string' && mapped[value] ? mapped[value] : value,
  ) as Game;
}
export function stripLocalAssets(game: Game): Game {
  return JSON.parse(JSON.stringify(game), (_key, value) =>
    typeof value === 'string' && isLocalAsset(value) ? '' : value,
  ) as Game;
}
export function hasLocalAssets(game: Game) {
  return assetReferences(game).some((a) => isLocalAsset(a.url));
}
export async function persistLocalAssets(game: Game): Promise<Game> {
  const mapped: Record<string, string> = {};
  for (const { url, kind } of assetReferences(game)) {
    if (!isLocalAsset(url) || mapped[url]) continue;
    const blob = await (await fetch(url)).blob();
    const type = blob.type || (kind === 'audio' ? 'audio/mpeg' : 'image/png');
    mapped[url] = await uploadAsset(
      new File([blob], kind === 'audio' ? 'sound' : 'art', { type }),
      kind,
    );
  }
  return rewriteAssets(game, mapped);
}
// Stored schemas retain stable asset IDs; credentials never appear in media URLs.
export function useMedia(url: string) {
  const [resolved, setResolved] = useState('');
  useEffect(() => {
    let disposed = false,
      objectUrl = '';
    if (!url) {
      setResolved('');
      return;
    }
    if (isLocalAsset(url) || isBundledAsset(url) || url.startsWith('data:')) {
      setResolved(url);
      return;
    }
    void requestHeaders()
      .then((headers) =>
        fetch(`${API_BASE_URL}${url}`, { headers, credentials: supabase ? 'omit' : 'include' }),
      )
      .then(async (r) => {
        if (!r.ok) throw new Error('Media unavailable');
        objectUrl = URL.createObjectURL(await r.blob());
        if (!disposed) setResolved(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (!disposed) setResolved('');
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  return resolved;
}
export function MediaImage({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const url = useMedia(src || '');
  return url ? <img {...props} src={url} /> : null;
}
export function MediaAudio({ src, ...props }: React.AudioHTMLAttributes<HTMLAudioElement>) {
  const url = useMedia(src || '');
  return url ? <audio {...props} src={url} /> : null;
}
export function useRuntimeMedia(game: Game) {
  const sources = useMemo(
    () =>
      [...new Set(assetReferences(game).map((a) => a.url))]
        .filter((url) => url.startsWith('/api/assets/') || isLocalAsset(url))
        .sort(),
    [game],
  );
  const key = JSON.stringify(sources);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadedKey, setLoadedKey] = useState('');
  useEffect(() => {
    let cancelled = false;
    const objects: string[] = [];
    if (!sources.length) {
      setUrls({});
      setLoadedKey(key);
      return;
    }
    void (async () => {
      const headers = await requestHeaders();
      const mapped: Record<string, string> = {};
      await Promise.all(
        sources.map(async (url) => {
          try {
            const remote = url.startsWith('/api/');
            const r = await fetch(remote ? `${API_BASE_URL}${url}` : url, {
              headers: remote ? headers : undefined,
              credentials: remote ? (supabase ? 'omit' : 'include') : 'omit',
              signal: AbortSignal.timeout(30000),
            });
            if (!r.ok) throw new Error('Media unavailable');
            const display = URL.createObjectURL(await r.blob());
            objects.push(display);
            mapped[url] = display;
          } catch {
            mapped[url] = url;
          }
        }),
      );
      if (cancelled) {
        objects.forEach(URL.revokeObjectURL);
        return;
      }
      setUrls(mapped);
      setLoadedKey(key);
    })();
    return () => {
      cancelled = true;
      objects.forEach(URL.revokeObjectURL);
    };
  }, [key]);
  return useMemo(() => {
    if (!sources.length) return game;
    if (loadedKey !== key || sources.some((url) => !urls[url])) return null;
    return rewriteAssets(game, urls);
  }, [game, key, loadedKey, sources, urls]);
}
