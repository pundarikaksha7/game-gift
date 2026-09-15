import { useEffect, useRef } from 'react';
import type { Game } from '../../shared/schema';
import { runtimeConfig, WORLD_UNIT } from '../../shared/runtime';
import { composeAvatar } from '../avatar/compose';

const MAX_COMPOSED_AVATARS = 24;
const composedAvatarCache = new Map<string, Promise<string>>();

function cachedAvatar(avatar: NonNullable<Game['characters'][number]['avatar']>) {
  const key = JSON.stringify(avatar);
  const cached = composedAvatarCache.get(key);
  if (cached) {
    composedAvatarCache.delete(key);
    composedAvatarCache.set(key, cached);
    return cached;
  }
  const composed = composeAvatar(avatar).catch((error) => {
    composedAvatarCache.delete(key);
    throw error;
  });
  composedAvatarCache.set(key, composed);
  if (composedAvatarCache.size > MAX_COMPOSED_AVATARS) {
    const oldest = composedAvatarCache.keys().next().value;
    if (oldest) composedAvatarCache.delete(oldest);
  }
  return composed;
}
export function AdventureRuntime({
  game,
  levelIndex = 0,
  playing = false,
  camera = 0,
  grid = false,
  onEnd,
  onPlatform,
  controls,
}: {
  game: Game;
  levelIndex?: number;
  playing?: boolean;
  camera?: number;
  grid?: boolean;
  onEnd?: (result: 'win' | 'lose') => void;
  onPlatform?: (x: number, y: number) => void;
  controls?: React.RefObject<Set<string>>;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onEnd, onPlatform });
  callbacks.current = { onEnd, onPlatform };
  const viewport = useRef({ camera, grid });
  viewport.current = { camera, grid };
  useEffect(() => {
    const frame = ref.current!;
    let active = true;
    let interval: ReturnType<typeof setInterval> | undefined;
    const receive = async (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.origin !== location.origin || !event.data)
        return;
      if (event.data.type === 'game-gift:ready') {
        const config = runtimeConfig(
          game,
          Math.min(levelIndex, game.levels.length - 1),
          viewport.current.camera,
        );
        const composed = await Promise.allSettled(
          game.characters
            .filter((character) => character.avatar && !character.sprite)
            .map(async (character) => ({
              character,
              texture: await cachedAvatar(character.avatar!),
            })),
        );
        if (!active) return;
        for (const result of composed) {
          if (result.status !== 'fulfilled') continue;
          const { character, texture } = result.value;
          config.assets[character.id] = texture;
          if (character.role === 'hero') config.assets.player_character = texture;
        }
        frame.contentWindow?.postMessage(
          {
            type: 'game-gift:init',
            config: {
              ...config,
              grid: viewport.current.grid,
            },
            mode: playing ? 'play' : 'preview',
          },
          location.origin,
        );
        if (playing) frame.focus();
      }
      if (
        event.data.type === 'game-gift:end' &&
        playing &&
        ['win', 'lose'].includes(event.data.result)
      )
        callbacks.current.onEnd?.(event.data.result);
      if (
        event.data.type === 'game-gift:point' &&
        !playing &&
        Number.isFinite(event.data.x) &&
        Number.isFinite(event.data.y)
      )
        callbacks.current.onPlatform?.(event.data.x * WORLD_UNIT, event.data.y * WORLD_UNIT);
    };
    window.addEventListener('message', receive);
    frame.src = '/engine/index.html';
    if (playing && controls)
      interval = setInterval(
        () =>
          frame.contentWindow?.postMessage(
            { type: 'game-gift:keys', keys: [...controls.current] },
            location.origin,
          ),
        16,
      );
    return () => {
      active = false;
      frame.contentWindow?.postMessage({ type: 'game-gift:dispose' }, location.origin);
      window.removeEventListener('message', receive);
      clearInterval(interval);
      controls?.current.clear();
    };
  }, [game, levelIndex, playing, controls]);
  useEffect(() => {
    ref.current?.contentWindow?.postMessage(
      { type: 'game-gift:viewport', camera: camera / WORLD_UNIT, grid },
      location.origin,
    );
  }, [camera, grid]);
  return (
    <iframe
      ref={ref}
      title={`${game.title} game ${playing ? 'playtest' : 'preview'}`}
      className="adventure-game-frame"
      allow="autoplay; fullscreen"
    />
  );
}
