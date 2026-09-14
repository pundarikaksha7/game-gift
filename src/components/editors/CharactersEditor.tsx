import { MediaImage, MediaAudio } from '../../media';
import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, User, Check, Image, Music2 } from 'lucide-react';
import type { Game, Character } from '../../../shared/schema';
import { newLevel } from '../../../shared/template';
import { attachAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';
import { AvatarRenderer } from '../../avatar/components/AvatarRenderer';
import { AvatarCreator } from '../../avatar/components/AvatarCreator';
import { defaultAvatar } from '../../../shared/avatar';
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
                avatar: structuredClone(defaultAvatar),
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
                <MediaImage src={char.sprite} alt={char.name} />
              ) : char.avatar ? (
                <AvatarRenderer config={char.avatar} label={char.name} />
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
                  g.levels.forEach((l) => {
                    if (l.boss?.characterId === c.id) {
                      l.boss.enabled = false;
                      delete l.boss.characterId;
                    }
                  });
                });
                setSelected(0);
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <AvatarCreator
          value={c.avatar}
          onChange={(avatar) => update({ avatar, sprite: '' })}
          onSave={(avatar) => {
            update({ avatar, sprite: '' });
            notify(`${c.name}'s character is ready — save the adventure to keep it`);
          }}
        />
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
        {c.role !== 'hero' && (
          <div className="form-grid">
            <Field label="Combat archetype">
              <select
                value={c.archetype || 'small'}
                onChange={(e) => update({ archetype: e.target.value as Character['archetype'] })}
              >
                <option value="small">Small · agile / ranged helper</option>
                <option value="medium">Medium · balanced</option>
                <option value="large">Large · heavy / melee helper</option>
              </select>
            </Field>
            {(c.role === 'enemy'
              ? (['health', 'damage', 'moveSpeed', 'attackCooldown'] as const)
              : (['damage', 'helperRange', 'attackCooldown'] as const)
            ).map((k) => (
              <Field
                key={k}
                label={
                  {
                    health: 'Enemy health',
                    damage: 'Attack damage',
                    moveSpeed: 'Movement speed',
                    attackCooldown: 'Attack cooldown (seconds)',
                    helperRange: 'Helper attack range',
                  }[k]
                }
              >
                <input
                  type="number"
                  step="any"
                  min={k === 'attackCooldown' ? 0.1 : k === 'damage' ? 0.1 : 1}
                  value={
                    c[k] ??
                    {
                      health: 28,
                      damage: c.role === 'friend' ? 6 : 0.35,
                      moveSpeed: 120,
                      attackCooldown: c.role === 'friend' ? 0.85 : 0.95,
                      helperRange: 380,
                    }[k]
                  }
                  onChange={(e) => update({ [k]: Number(e.target.value) })}
                />
              </Field>
            ))}
          </div>
        )}
        <button className="secondary" onClick={() => update({ sprite: '', avatar: c.avatar })}>
          Use custom character
        </button>
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
            disabled={busy}
            accept="image/png,image/jpeg,image/webp"
            onFile={async (f) => {
              setBusy(true);
              try {
                const id = c.id;
                const sprite = await attachAsset(f, 'image');
                change((g) => {
                  const target = g.characters.find((x) => x.id === id);
                  if (target) target.sprite = sprite;
                });
                notify('Character uploaded');
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
        <div className="upload-row">
          <div>
            <strong>Character animation frames</strong>
            <small>
              Optional frames for this character; procedural movement, attack and hit effects remain
              active.
            </small>
          </div>
          <UploadButton
            label="Add character frame"
            disabled={(c.frames?.length || 0) >= 24}
            accept="image/png,image/webp,image/jpeg"
            onFile={async (f) => {
              const id = c.id;
              try {
                const url = await attachAsset(f, 'image');
                change((g) => {
                  const target = g.characters.find((x) => x.id === id);
                  if (target) target.frames = [...(target.frames || []), url];
                });
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          />
        </div>
        <div className="frames">
          {c.frames?.map((url, i) => (
            <div className="frame" key={`${url}-${i}`}>
              <MediaImage src={url} alt={`${c.name} frame ${i + 1}`} />
              <button
                className="icon-btn"
                aria-label={`Remove character frame ${i + 1}`}
                onClick={() => update({ frames: c.frames?.filter((_, j) => j !== i) })}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        {!authed && (
          <small className="muted">
            Sign in and save to keep this art in your Gamegift account.
          </small>
        )}
      </div>
    </>
  );
}
