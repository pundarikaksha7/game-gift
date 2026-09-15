import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, User, Check, Image, Music2 } from 'lucide-react';
import type { Game, Character } from '../../../shared/schema';
import { newLevel } from '../../../shared/template';
import { uploadAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';
export function StoryEditor({ game, change }: EditorProps) {
  const companions = game.characters.filter((character) => character.role === 'friend');
  return (
    <>
      <div className="section-top">
        <div>
          <h2>A story only you could tell</h2>
          <p>Inside jokes, big memories, and a little magic.</p>
        </div>
        <span className="pill">{game.levels.length + 2} story moments</span>
      </div>
      <div className="form-card">
        <Field
          label="Story narrator"
          hint="This companion speaks in the chapter scenes while the hero listens."
        >
          <select
            value={game.story.narratorId || companions[0]?.id || ''}
            disabled={!companions.length}
            onChange={(e) =>
              change((g) => {
                g.story.narratorId = e.target.value || undefined;
              })
            }
          >
            {!companions.length && <option value="">Add a companion first</option>}
            {companions.map((companion) => (
              <option key={companion.id} value={companion.id}>
                {companion.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Made especially for">
          <input
            value={game.recipient}
            onChange={(e) =>
              change((g) => {
                g.recipient = e.target.value;
              })
            }
          />
        </Field>
        <Field label="The opening scene" hint="Welcomes the player before the first chapter.">
          <textarea
            rows={4}
            maxLength={2000}
            value={game.story.opening}
            onChange={(e) =>
              change((g) => {
                g.story.opening = e.target.value;
              })
            }
          />
        </Field>
      </div>
      {game.levels.map((l, i) => (
        <div className="form-card" key={l.id}>
          <span className="eyebrow">
            CHAPTER {i + 1} · {l.name}
          </span>
          <Field label="Before the adventure">
            <textarea
              rows={2}
              maxLength={2000}
              value={l.intro}
              onChange={(e) =>
                change((g) => {
                  g.levels[i].intro = e.target.value;
                })
              }
            />
          </Field>
          <Field label="When they reach the flag">
            <textarea
              rows={2}
              maxLength={2000}
              value={l.outro}
              onChange={(e) =>
                change((g) => {
                  g.levels[i].outro = e.target.value;
                })
              }
            />
          </Field>
        </div>
      ))}
      <div className="form-card">
        <Field label="The grand finale" hint="The message waiting at the end of their journey.">
          <textarea
            rows={4}
            maxLength={2000}
            value={game.story.ending}
            onChange={(e) =>
              change((g) => {
                g.story.ending = e.target.value;
              })
            }
          />
        </Field>
      </div>
    </>
  );
}
