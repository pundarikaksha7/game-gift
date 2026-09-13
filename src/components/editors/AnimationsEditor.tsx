import { MediaImage, MediaAudio } from '../../media';
import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, User, Check, Image, Music2 } from 'lucide-react';
import type { Game, Character } from '../../../shared/schema';
import { newLevel } from '../../../shared/template';
import { attachAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';
export function AnimationsEditor({ game, change, notify, authed }: EditorProps) {
  const a = game.animation;
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="section-top">
        <div>
          <h2>A little extra personality</h2>
          <p>Make your characters move in their own way.</p>
        </div>
        <span className="pill">Live in preview</span>
      </div>
      <div className="preset-grid">
        {(['bounce', 'float', 'none'] as const).map((p) => (
          <button
            className={`preset ${a.preset === p ? 'selected' : ''}`}
            key={p}
            onClick={() =>
              change((g) => {
                g.animation.preset = p;
              })
            }
          >
            <span className={`animation-demo ${p}`}>✦</span>
            <strong>
              {p === 'bounce' ? 'Happy bounce' : p === 'float' ? 'Dreamy float' : 'Keep it still'}
            </strong>
            <small>
              {p === 'bounce'
                ? 'A spring in every step'
                : p === 'float'
                  ? 'A softer kind of magic'
                  : 'Let your art do the talking'}
            </small>
          </button>
        ))}
      </div>
      <div className="form-card">
        <div className="form-grid">
          <Field label={`Motion speed · ${a.speed.toFixed(1)}×`}>
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.1}
              value={a.speed}
              onChange={(e) =>
                change((g) => {
                  g.animation.speed = Number(e.target.value);
                })
              }
            />
          </Field>
          <Field label={`Squash & stretch · ${Math.round(a.squash * 100)}%`}>
            <input
              type="range"
              min={0}
              max={0.3}
              step={0.01}
              value={a.squash}
              onChange={(e) =>
                change((g) => {
                  g.animation.squash = Number(e.target.value);
                })
              }
            />
          </Field>
        </div>
      </div>
      <div className="form-card">
        <div className="section-top compact">
          <div>
            <h3>Your own frame animation</h3>
            <p>Upload individual frames in playback order.</p>
          </div>
          <UploadButton
            label={busy ? 'Uploading…' : 'Add frame'}
            disabled={busy || a.frames.length >= 24}
            accept="image/png,image/webp,image/jpeg"
            onFile={async (f) => {
              setBusy(true);
              try {
                const url = await attachAsset(f, 'image');
                change((g) => g.animation.frames.push(url));
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
        <div className="frames">
          {a.frames.length === 0 ? (
            <div className="empty-state">
              <Image size={25} />
              <p>Your hero’s custom frames will appear here.</p>
              <small>Up to 24 frames · Transparent art recommended</small>
            </div>
          ) : (
            a.frames.map((url, i) => (
              <div className="frame" key={`${url}-${i}`}>
                <MediaImage src={url} alt={`Frame ${i + 1}`} />
                <span>{i + 1}</span>
                <button
                  className="icon-btn"
                  aria-label={`Delete frame ${i + 1}`}
                  onClick={() =>
                    change((g) => {
                      g.animation.frames.splice(i, 1);
                    })
                  }
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
        <Field label={`Playback · ${a.fps} frames per second`}>
          <input
            type="range"
            min={1}
            max={30}
            value={a.fps}
            onChange={(e) =>
              change((g) => {
                g.animation.fps = Number(e.target.value);
              })
            }
          />
        </Field>
      </div>
    </>
  );
}
