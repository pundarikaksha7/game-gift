import { useEffect, useRef } from 'react';
import type { Game } from '../../shared/schema';
import { runtimeConfig, WORLD_UNIT } from '../../shared/runtime';
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
    let interval: ReturnType<typeof setInterval> | undefined;
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.origin !== location.origin || !event.data)
        return;
      if (event.data.type === 'playcraft:ready') {
        frame.contentWindow?.postMessage(
          {
            type: 'playcraft:init',
            config: {
              ...runtimeConfig(
                game,
                Math.min(levelIndex, game.levels.length - 1),
                viewport.current.camera,
              ),
              grid: viewport.current.grid,
            },
            mode: playing ? 'play' : 'preview',
          },
          location.origin,
        );
        if (playing) frame.focus();
      }
      if (
        event.data.type === 'playcraft:end' &&
        playing &&
        ['win', 'lose'].includes(event.data.result)
      )
        callbacks.current.onEnd?.(event.data.result);
      if (
        event.data.type === 'playcraft:point' &&
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
            { type: 'playcraft:keys', keys: [...controls.current] },
            location.origin,
          ),
        16,
      );
    return () => {
      window.removeEventListener('message', receive);
      clearInterval(interval);
      controls?.current.clear();
    };
  }, [game, levelIndex, playing, controls]);
  useEffect(() => {
    ref.current?.contentWindow?.postMessage(
      { type: 'playcraft:viewport', camera: camera / WORLD_UNIT, grid },
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
