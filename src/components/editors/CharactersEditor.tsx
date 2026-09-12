import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, User, Check, Image, Music2 } from 'lucide-react';
import type { Game, Character } from '../../../shared/schema';
import { newLevel } from '../../../shared/template';
import { uploadAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';
export function CharactersEditor({ game, change, notify, authed }: EditorProps) {
  const [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false);
  const c = game.characters[Math.min(selected, game.characters.length - 1)];
  function update(partial: Partial<Character>) {
    change((g) =>
      Object.assign(
        g.characters.find((x) => x.id === c.id)!,
        partial,
      ),
    );
  }
  return (
    <>
      <div className="section-top">
        <div>
          <h2>Meet your characters</h2>
          <p>Familiar faces make the best adventures.</p>
        </div>
        <button
          className="secondary"
          disabled={game.characters.length >= 12}
          onClick={() => {
            change((g) =>
              g.characters.push({
                id: crypto.randomUUID(),
                name: 'New friend',
                role: 'friend',
                sprite: '',
                color: '#bbadcf',
                scale: 1,
              }),
            );
            setSelected(game.characters.length);
          }}
        >
          <Plus size={16} /> Add character
        </button>
      </div>
      <div className="character-grid">
        {game.characters.map((char, i) => (
          <button
            key={char.id}
            className={`character-card ${c.id === char.id ? 'selected' : ''}`}
            onClick={() => setSelected(i)}
          >
            <div className="character-art" style={{ background: char.color + '24' }}>
              {char.sprite ? (
                <img src={char.sprite} alt={char.name} />
              ) : (
                <User size={70} color={char.color} />
              )}
              <span className="role-badge">{char.role}</span>
              {c.id === char.id && (
                <span className="check-dot">
                  <Check size={12} />
                </span>
              )}
            </div>
            <strong>{char.name}</strong>
            <small>
              {char.role === 'hero'
                ? 'The heart of your story'
                : char.role === 'enemy'
                  ? 'A little friendly trouble'
                  : 'Along for the adventure'}
            </small>
          </button>
        ))}
      </div>
      <div className="form-card">
        <div className="form-card-title">
          <h3>Make {c.name} your own</h3>
          {c.role !== 'hero' && (
            <button
              className="icon-btn danger"
              aria-label="Delete character"
              onClick={() => {
                change((g) => {
                  g.characters = g.characters.filter((x) => x.id !== c.id);
                });
                setSelected(0);
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div className="form-grid">
          <Field label="Character name">
            <input
              value={c.name}
              maxLength={60}
              onChange={(e) => update({ name: e.target.value })}
            />
          </Field>
          <Field label="Role in the story">
            <select
              value={c.role}
              onChange={(e) =>
                change((g) => {
                  const role = e.target.value as Character['role'];
                  if (role === 'hero')
                    g.characters.forEach((x) => {
                      if (x.role === 'hero') x.role = 'friend';
                    });
                  g.characters.find((x) => x.id === c.id)!.role = role;
                })
              }
              disabled={c.role === 'hero'}
            >
              <option value="hero">Hero</option>
              <option value="friend">Friend</option>
              <option value="enemy">Enemy</option>
            </select>
          </Field>
          <Field label="Accent color">
            <div className="color-field">
              <input
                type="color"
                value={c.color}
                onChange={(e) => update({ color: e.target.value })}
              />
              <span>{c.color}</span>
            </div>
          </Field>
          <Field label={`Character size · ${c.scale.toFixed(1)}×`}>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={c.scale}
              onChange={(e) => update({ scale: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="upload-row">
          <div>
            <Image size={19} />
            <div>
              <strong>Your art, your character</strong>
              <small>Transparent PNG or WebP works best. Up to 10 MB.</small>
            </div>
          </div>
          <UploadButton
            label={busy ? 'Uploading…' : 'Upload character'}
            disabled={busy || !authed}
            accept="image/png,image/jpeg,image/webp"
            onFile={async (f) => {
              setBusy(true);
              try {
                update({ sprite: await uploadAsset(f, 'image') });
                notify('Character uploaded');
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
        {!authed && <small className="muted">Sign in to upload and store your own assets.</small>}
      </div>
    </>
  );
}
