import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Swords, Play, RotateCcw } from 'lucide-react';
import type { Game } from '../../shared/schema';
import { GameCanvas } from './GameCanvas';
export function PlayGame({ game, startLevel = 0 }: { game: Game; startLevel?: number }) {
  const storyManagedByEngine = game.engine !== 'classic';
  const [level, setLevel] = useState(startLevel),
    [stage, setStage] = useState<'intro' | 'playing' | 'win' | 'lose' | 'end'>(
      storyManagedByEngine ? 'playing' : 'intro',
    ),
    [run, setRun] = useState(0);
  const controls = useRef(new Set<string>());
  const current = game.levels[level];
  function start() {
    setRun((r) => r + 1);
    setStage('playing');
  }
  return (
    <div className="play-game">
      <div className="play-surface">
        <GameCanvas
          key={run}
          game={game}
          levelIndex={level}
          playing={stage === 'playing'}
          controls={controls}
          onEnd={storyManagedByEngine ? undefined : setStage}
        />
        {stage !== 'playing' && (
          <div className="play-overlay">
            <div>
              <span className="eyebrow">
                {stage === 'end'
                  ? 'EXPERIENCE COMPLETE'
                  : `CHAPTER ${String(level + 1).padStart(2, '0')}`}
              </span>
              <h2>
                {stage === 'lose'
                  ? 'A little stumble. Try again?'
                  : stage === 'end'
                    ? 'Thanks for playing.'
                    : current.name}
              </h2>
              <p>
                {stage === 'end'
                  ? game.story.ending
                  : stage === 'win'
                    ? current.outro
                    : stage === 'lose'
                      ? 'Your next adventure is one more try away.'
                      : `${level === 0 ? game.story.opening + ' ' : ''}${current.intro}`}
              </p>
              <button
                className="primary"
                onClick={() => {
                  if (stage === 'end') {
                    setLevel(0);
                    setStage('intro');
                  } else if (stage === 'win') {
                    if (level === game.levels.length - 1) setStage('end');
                    else {
                      setLevel(level + 1);
                      setStage('intro');
                    }
                  } else start();
                }}
              >
                {stage === 'lose' ? <RotateCcw size={16} /> : <Play size={16} />}{' '}
                {stage === 'win' ? 'Continue' : stage === 'end' ? 'Play again' : 'Let’s go'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="play-controls">
        <span>← → / A D to move · Space to jump · J punch · K kick · P pause</span>
        <div>
          {[
            [ArrowLeft, 'ArrowLeft'],
            [ArrowRight, 'ArrowRight'],
            [ArrowUp, 'Space'],
            [Swords, 'KeyJ'],
            [Swords, 'KeyK'],
          ].map(([Icon, code]) => {
            const I = Icon as typeof ArrowLeft;
            return (
              <button
                key={String(code)}
                aria-label={String(code)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  controls.current.add(String(code));
                }}
                onPointerUp={() => controls.current.delete(String(code))}
                onPointerCancel={() => controls.current.delete(String(code))}
                onLostPointerCapture={() => controls.current.delete(String(code))}
              >
                <I size={21} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
