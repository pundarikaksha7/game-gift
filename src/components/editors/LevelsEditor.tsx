import { EncounterEditor } from './EncounterEditor';
import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, User, Check, Image, Music2 } from 'lucide-react';
import { newLevel } from '../../../shared/template';
import { attachAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';
export function LevelsEditor({
  game,
  change,
  notify,
  authed,
  level,
  setLevel,
  placing,
  setPlacing,
}: EditorProps & {
  level: number;
  setLevel: (n: number) => void;
  placing: boolean;
  setPlacing: (b: boolean) => void;
}) {
  const l = game.levels[level];
  return (
    <>
      <div className="section-top">
        <div>
          <h2>Build their little world</h2>
          <p>One memorable place at a time.</p>
        </div>
        <button
          className="secondary"
          disabled={game.levels.length >= 12}
          onClick={() => {
            change((g) => g.levels.push(newLevel(g.levels.length)));
            setLevel(game.levels.length);
          }}
        >
          <Plus size={16} /> Add level
        </button>
      </div>
      <div className="level-list">
        {game.levels.map((x, i) => (
          <button
            className={`level-item ${i === level ? 'selected' : ''}`}
            key={x.id}
            onClick={() => setLevel(i)}
          >
            <span className={`level-thumb ${x.theme}`}>
              <span>✦</span>
            </span>
            <div>
              <small>CHAPTER {String(i + 1).padStart(2, '0')}</small>
              <strong>{x.name}</strong>
            </div>
            <span className="muted">{x.platforms.length} platforms</span>
          </button>
        ))}
      </div>
      <div className="form-card">
        <div className="form-card-title">
          <h3>Chapter {level + 1} settings</h3>
          <div className="inline-actions">
            <button
              className="icon-btn"
              aria-label="Move level up"
              disabled={level === 0}
              onClick={() => {
                change((g) => {
                  [g.levels[level - 1], g.levels[level]] = [g.levels[level], g.levels[level - 1]];
                });
                setLevel(level - 1);
              }}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="icon-btn"
              aria-label="Move level down"
              disabled={level === game.levels.length - 1}
              onClick={() => {
                change((g) => {
                  [g.levels[level + 1], g.levels[level]] = [g.levels[level], g.levels[level + 1]];
                });
                setLevel(level + 1);
              }}
            >
              <ArrowDown size={16} />
            </button>
            <button
              className="icon-btn danger"
              aria-label="Delete level"
              disabled={game.levels.length === 1}
              onClick={() => {
                change((g) => {
                  g.levels.splice(level, 1);
                });
                setLevel(0);
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Level name">
            <input
              value={l.name}
              onChange={(e) =>
                change((g) => {
                  g.levels[level].name = e.target.value;
                })
              }
            />
          </Field>
          <Field label="Atmosphere">
            <select
              value={l.theme}
              onChange={(e) =>
                change((g) => {
                  g.levels[level].theme = e.target.value as typeof l.theme;
                })
              }
            >
              <option value="meadow">Morning meadow</option>
              <option value="sunset">Golden hour</option>
              <option value="midnight">Midnight magic</option>
            </select>
          </Field>
          <Field label="World width">
            <input
              type="number"
              min={1200}
              max={10000}
              value={l.width}
              onChange={(e) =>
                change((g) => {
                  g.levels[level].width = Number(e.target.value);
                })
              }
            />
          </Field>
          <Field label="Enemies">
            <input
              type="number"
              min={0}
              max={200}
              value={l.enemyCount}
              onChange={(e) =>
                change((g) => {
                  g.levels[level].enemyCount = Number(e.target.value);
                  g.levels[level].difficulty = 'custom';
                })
              }
            />
          </Field>
        </div>
        <Field
          label="Chapter background"
          hint="Choose an atmosphere above, or upload PNG, JPEG or WebP artwork. Artwork fills the sky; platforms stay visible."
        >
          <UploadButton
            label="Upload background"
            accept="image/png,image/jpeg,image/webp"
            onFile={async (file) => {
              const id = l.id;
              try {
                const url = await attachAsset(file, 'image');
                change((g) => {
                  const chapter = g.levels.find((x) => x.id === id);
                  if (chapter) chapter.background = url;
                });
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          />
        </Field>
        {!authed && (
          <p className="muted">Sign in and save to keep this artwork in your Gamegift account.</p>
        )}
        {l.background && (
          <button
            className="secondary"
            onClick={() =>
              change((g) => {
                g.levels[level].background = '';
              })
            }
          >
            Use atmosphere background
          </button>
        )}
        <div className="section-top compact">
          <h3>Platforms</h3>
          <button
            className={placing ? 'primary' : 'secondary'}
            disabled={l.platforms.length >= 80}
            onClick={() => setPlacing(!placing)}
          >
            <Plus size={14} />
            {placing ? 'Click in the preview' : 'Place a platform'}
          </button>
        </div>
        <p className="muted">
          Click the preview to place. Adjust positions below; scroll the world using its slider.
        </p>
        <div className="platform-table">
          <div className="platform-row table-label">
            <span>X</span>
            <span>Y</span>
            <span>Width</span>
            <span>Movement</span>
            <span />
          </div>
          {l.platforms.map((p, i) => (
            <div className="platform-row" key={p.id}>
              {(['x', 'y', 'width'] as const).map((k) => (
                <input
                  key={k}
                  aria-label={`Platform ${i + 1} ${k}`}
                  type="number"
                  value={p[k]}
                  onChange={(e) =>
                    change((g) => {
                      g.levels[level].platforms[i][k] = Number(e.target.value);
                    })
                  }
                />
              ))}
              <select
                aria-label={`Platform ${i + 1} motion`}
                value={p.motion}
                onChange={(e) =>
                  change((g) => {
                    g.levels[level].platforms[i].motion = e.target.value as typeof p.motion;
                  })
                }
              >
                <option value="none">Still</option>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="both">Both axes</option>
              </select>
              <button
                className="icon-btn"
                aria-label={`Remove platform ${i + 1}`}
                onClick={() =>
                  change((g) => {
                    g.levels[level].platforms.splice(i, 1);
                  })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <EncounterEditor game={game} change={change} notify={notify} authed={authed} level={level} />
    </>
  );
}
