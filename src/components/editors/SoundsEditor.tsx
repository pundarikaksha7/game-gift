import { MediaImage, MediaAudio } from '../../media';
import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, User, Check, Image, Music2 } from 'lucide-react';
import type { Game, Character } from '../../../shared/schema';
import { newLevel } from '../../../shared/template';
import { uploadAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';
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
      {(['music', 'jump', 'hit', 'win'] as const).map((k) => (
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
                    jump: 'A leap of faith',
                    hit: 'A little action',
                    win: 'The victory moment',
                  }[k]
                }
              </h3>
              <p>
                {game.sounds[k]
                  ? 'Your uploaded sound'
                  : k === 'music'
                    ? 'No background track yet'
                    : 'Built-in arcade sound'}
              </p>
            </div>
          </div>
          {game.sounds[k] && <MediaAudio controls src={game.sounds[k]} preload="none" />}
          <div className="inline-actions">
            <UploadButton
              label={busy === k ? 'Uploading…' : 'Upload audio'}
              disabled={!authed || !!busy}
              accept="audio/mpeg,audio/wav,audio/ogg"
              onFile={async (f) => {
                setBusy(k);
                try {
                  const url = await uploadAsset(f, 'audio');
                  change((g) => {
                    g.sounds[k] = url;
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
      <p className="muted">
        MP3, WAV or OGG · Up to 10 MB per file. {!authed && 'Sign in to upload.'}
      </p>
    </>
  );
}
