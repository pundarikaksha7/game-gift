import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, User, Check, Image, Music2 } from 'lucide-react';
import type { Game, Character } from '../../../shared/schema';
import { newLevel } from '../../../shared/template';
import { uploadAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';
export function SettingsEditor({ game, change }: EditorProps) {
  return (
    <>
      <div className="section-top">
        <div>
          <h2>Start with your game</h2>
          <p>Name your adventure, then choose how your player moves.</p>
        </div>
      </div>
      <div className="form-card">
        <Field label="Game title">
          <input
            maxLength={80}
            value={game.title}
            onChange={(e) =>
              change((g) => {
                g.title = e.target.value;
              })
            }
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={3}
            maxLength={2000}
            value={game.description}
            onChange={(e) =>
              change((g) => {
                g.description = e.target.value;
              })
            }
          />
        </Field>
      </div>
      <div className="form-card">
        <h3>How it feels to play</h3>
        <div className="inline-actions">
          {[
            { name: 'Relaxed', speed: 220, jump: 650, gravity: 1200, health: 8 },
            { name: 'Classic', speed: 270, jump: 590, gravity: 1500, health: 5 },
            { name: 'Fast', speed: 380, jump: 700, gravity: 1800, health: 3 },
          ].map(({ name, ...physics }) => (
            <button
              key={name}
              className="secondary"
              onClick={() =>
                change((g) => {
                  g.physics = { ...g.physics, ...physics };
                })
              }
            >
              {name}
            </button>
          ))}
        </div>
        <Field label="Extra jumps in the air">
          <select
            value={game.physics.airJumps || 0}
            onChange={(e) =>
              change((g) => {
                g.physics.airJumps = Number(e.target.value);
              })
            }
          >
            <option value={0}>Single jump</option>
            <option value={1}>Double jump</option>
            <option value={2}>Triple jump</option>
          </select>
        </Field>
        <p className="muted">
          Move: arrows or A/D · Jump: Space, W or ↑ · Attack: J/K. Touch controls appear in
          playtest.
        </p>
        <div className="form-grid">
          {(['speed', 'jump', 'gravity', 'health'] as const).map((k) => (
            <Field
              key={k}
              label={
                k === 'speed'
                  ? 'Movement speed'
                  : k === 'jump'
                    ? 'Jump strength'
                    : k === 'gravity'
                      ? 'Gravity'
                      : 'Starting hearts'
              }
            >
              <input
                type="number"
                min={{ speed: 100, jump: 350, gravity: 800, health: 1 }[k]}
                max={{ speed: 500, jump: 850, gravity: 2200, health: 10 }[k]}
                value={game.physics[k]}
                onChange={(e) =>
                  change((g) => {
                    g.physics[k] = Number(e.target.value);
                  })
                }
              />
            </Field>
          ))}
        </div>
        <p className="muted">
          Changes are validated before saving. Playtest to check the difficulty feels right.
        </p>
      </div>
    </>
  );
}
