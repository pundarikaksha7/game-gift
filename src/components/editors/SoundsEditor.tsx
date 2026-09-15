import { MediaAudio } from '../../media';
import { useState } from 'react';
import { Trash2, Music2 } from 'lucide-react';
import { attachAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';

const soundProfiles = {
  music: [
    [
      'Background 1 · Energetic platformer',
      '/assets/sounds/background/nickpanek-energetic-chiptune-video-game-music-platformer-8-bit-318348.mp3',
    ],
    [
      'Background 2 · Tropic dash',
      '/assets/sounds/background/bonfirelightmusic-tropic-dash-357222.mp3',
    ],
    [
      'Background 3 · High-energy chiptune',
      '/assets/sounds/background/nickpanek-high-energy-chiptune-for-platform-games-225292.mp3',
    ],
    ['Background 4 · 8-bit arcade', '/assets/sounds/background/echobrainz-8-bit-arcade-534134.mp3'],
  ],
  jump: [['Jump sound 1', '/assets/sounds/jump/bestuploadsever67aryan-jump-sound-531048.mp3']],
  punch: [['Punch sound 1', '/assets/sounds/attack/punch/universfield-punch-03-352040.mp3']],
  kick: [['Kick sound 1', '/assets/sounds/attack/kick/khoamthanh-kick-bright-medium-504170.mp3']],
  heroAttack: [
    [
      'Hero voice 1 · Female',
      '/assets/sounds/hero/female/freesound_gamestudio-female-character-attack-vocal-6-408474.mp3',
    ],
    ['Hero voice 2 · Male', '/assets/sounds/hero/male/freesound_community-male-gasp-1-7183.mp3'],
  ],
  villainAttack: [
    [
      'Villain voice 1 · Female',
      '/assets/sounds/villains/female/phatphrogstudio-rpg-female-attack-grunt-no-ai-481720.mp3',
    ],
    [
      'Villain voice 2 · Male',
      '/assets/sounds/villains/male/phatphrogstudio-male-soldier-voice-attack-grunt-520841.mp3',
    ],
  ],
} as const;

export function SoundsEditor({ game, change, notify, authed }: EditorProps) {
  const [busy, setBusy] = useState('');
  return (
    <>
      <div className="section-top">
        <div>
          <h2>Give your world a soundtrack</h2>
          <p>The sounds that bring every moment to life.</p>
        </div>
      </div>
      <div className="form-card">
        <Field label={`Master volume · ${Math.round(game.sounds.volume * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={game.sounds.volume}
            onChange={(e) =>
              change((g) => {
                g.sounds.volume = Number(e.target.value);
              })
            }
          />
        </Field>
      </div>
      {(Object.keys(soundProfiles) as (keyof typeof soundProfiles)[]).map((k) => (
        <div className="sound-card" key={k}>
          <div className="sound-label">
            <span className="sound-icon">
              <Music2 size={20} />
            </span>
            <div>
              <h3>
                {
                  {
                    music: 'Background music',
                    jump: 'Jump',
                    punch: 'Punch',
                    kick: 'Kick',
                    heroAttack: 'Hero attack voice',
                    villainAttack: 'Villain attack voice',
                  }[k]
                }
              </h3>
              <p>Choose a built-in profile or upload your own.</p>
            </div>
          </div>
          <select
            aria-label={`${k} sound profile`}
            value={game.sounds[k] || ''}
            onChange={(e) =>
              change((g) => {
                g.sounds[k] = e.target.value;
                if (k === 'punch') g.sounds.hit = e.target.value;
              })
            }
          >
            <option value="">No sound</option>
            {soundProfiles[k].map(([label, url]) => (
              <option key={url} value={url}>
                {label}
              </option>
            ))}
            {game.sounds[k] && !soundProfiles[k].some(([, url]) => url === game.sounds[k]) && (
              <option value={game.sounds[k]}>Uploaded sound</option>
            )}
          </select>
          {game.sounds[k] && <MediaAudio controls src={game.sounds[k]} preload="none" />}
          <div className="inline-actions">
            <UploadButton
              label={busy === k ? 'Uploading…' : 'Upload audio'}
              disabled={!!busy}
              accept="audio/mpeg,audio/wav,audio/ogg"
              onFile={async (f) => {
                setBusy(k);
                try {
                  const url = await attachAsset(f, 'audio');
                  change((g) => {
                    g.sounds[k] = url;
                    if (k === 'punch') g.sounds.hit = url;
                  });
                  notify('Sound uploaded');
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setBusy('');
                }
              }}
            />
            {game.sounds[k] && (
              <button
                className="icon-btn"
                aria-label={`Reset ${k}`}
                onClick={() =>
                  change((g) => {
                    g.sounds[k] = '';
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}
      <div className="sound-card">
        <div className="sound-label">
          <span className="sound-icon">
            <Music2 size={20} />
          </span>
          <div>
            <h3>Victory moment</h3>
            <p>Upload a custom celebration sound.</p>
          </div>
        </div>
        {game.sounds.win && <MediaAudio controls src={game.sounds.win} preload="none" />}
        <div className="inline-actions">
          <UploadButton
            label={busy === 'win' ? 'Uploading…' : 'Upload audio'}
            disabled={!!busy}
            accept="audio/mpeg,audio/wav,audio/ogg"
            onFile={async (f) => {
              setBusy('win');
              try {
                const url = await attachAsset(f, 'audio');
                change((g) => {
                  g.sounds.win = url;
                });
                notify('Victory sound uploaded');
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy('');
              }
            }}
          />
          {game.sounds.win && (
            <button
              className="icon-btn"
              aria-label="Reset victory sound"
              onClick={() =>
                change((g) => {
                  g.sounds.win = '';
                })
              }
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <p className="muted">
        MP3, WAV or OGG · Up to 10 MB per file.
        {!authed && ' Sign in and save to keep audio in your Gamegift account.'}
      </p>
    </>
  );
}
