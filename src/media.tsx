import { useEffect, useState } from 'react';
import { API_BASE_URL, requestHeaders } from './api';
import { supabase } from './auth';
import type { Game } from '../shared/schema';
import { assetReferences } from '../shared/schema';
// Stored schemas retain stable asset IDs; credentials never appear in media URLs.
export function useMedia(url: string) {
  const [resolved, setResolved] = useState('');
  useEffect(() => {
    let disposed = false, objectUrl = '';
    if (!url) { setResolved(''); return; }
    void requestHeaders().then(headers => fetch(`${API_BASE_URL}${url}`, { headers, credentials: supabase ? 'omit' : 'include' })).then(async r => {
      if (!r.ok) throw new Error('Media unavailable');
      objectUrl = URL.createObjectURL(await r.blob());
      if (!disposed) setResolved(objectUrl); else URL.revokeObjectURL(objectUrl);
    }).catch(() => { if (!disposed) setResolved(''); });
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);
  return resolved;
}
export function MediaImage({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) { const url = useMedia(src || ''); return url ? <img {...props} src={url} /> : null; }
export function MediaAudio({ src, ...props }: React.AudioHTMLAttributes<HTMLAudioElement>) { const url = useMedia(src || ''); return url ? <audio {...props} src={url} /> : null; }
export function useRuntimeMedia(game: Game) {
  const [resolved, setResolved] = useState<Game | null>(null);
  const key = JSON.stringify([...new Set(assetReferences(game).map(a => a.url))].sort());
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const objects: string[] = [];
    void (async () => {
      const headers = await requestHeaders();
      const entries = await Promise.all((JSON.parse(key) as string[]).map(async url => {
        const r = await fetch(`${API_BASE_URL}${url}`, { headers, credentials: supabase ? 'omit' : 'include', signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error('Media unavailable');
        const blob = URL.createObjectURL(await r.blob()); objects.push(blob);
        return [url, blob] as const;
      }));
      if (!cancelled) setUrls(Object.fromEntries(entries));
    })().catch(() => { if (!cancelled) setUrls({}); }).finally(() => { if (cancelled) objects.forEach(URL.revokeObjectURL); });
    return () => { cancelled = true; objects.forEach(URL.revokeObjectURL); };
  }, [key]);
  useEffect(() => {
    const next = JSON.parse(JSON.stringify(game), (_key, value) => typeof value === 'string' && value.startsWith('/api/assets/') ? urls[value] || '' : value);
    setResolved(next);
  }, [game, urls]);
  return resolved || game;
}
