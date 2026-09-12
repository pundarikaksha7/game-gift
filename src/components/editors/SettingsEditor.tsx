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
          <h2>The finishing touches</h2>
          <p>A name, a feeling, and just the right challenge.</p>
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
