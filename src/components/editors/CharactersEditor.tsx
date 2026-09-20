import { MediaImage } from '../../media';
import { useEffect, useState } from 'react';
import { Plus, Trash2, User, Check, Image } from 'lucide-react';
import type { Game, Character } from '../../../shared/schema';
import { attachAsset } from '../../api';
import { Field, UploadButton } from '../UI';
import type { EditorProps } from './types';
import { AvatarRenderer } from '../../avatar/components/AvatarRenderer';
import { AvatarCreator } from '../../avatar/components/AvatarCreator';
import { defaultAvatar } from '../../../shared/avatar';
export function CharactersEditor({ game, change, notify }: EditorProps) {
  const [selectedId, setSelectedId] = useState(game.characters[0].id);
  const [uploading, setUploading] = useState(false);
  const c = game.characters.find((character) => character.id === selectedId) || game.characters[0];
  useEffect(() => {
    if (!game.characters.some((character) => character.id === selectedId)) {
      setSelectedId(game.characters[0].id);
    }
  }, [game.characters, selectedId]);
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
            const id = crypto.randomUUID();
            change((g) =>
              g.characters.push({
                id,
                name: '',
                role: 'friend',
                sprite: '',
                color: '#bbadcf',
                scale: 1,
                avatar: structuredClone(defaultAvatar),
              }),
            );
            setSelectedId(id);
          }}
        >
          <Plus size={16} /> Add character
        </button>
      </div>
      <div className="character-workbench" aria-label="Character roster">
        <div className="character-workbench-label">
          <span>Roster</span>
          <small>{game.characters.length} of 12 characters</small>
        </div>
        <div className="character-grid">
          {game.characters.map((char) => (
            <button
              key={char.id}
              className={`character-card ${c.id === char.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(char.id)}
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
              <small>{char.role}</small>
            </button>
          ))}
        </div>
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
                  if (g.story.narratorId === c.id) delete g.story.narratorId;
                  g.levels.forEach((l) => {
                    if (l.boss?.characterId === c.id) {
                      l.boss.enabled = false;
                      delete l.boss.characterId;
                    }
                  });
                });
                setSelectedId(game.characters[0].id);
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div className="character-section-label">
          <span>01</span>
          <div>
            <strong>Identity</strong>
            <small>Name the character and define how they appear in the story.</small>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Character name">
            <input
              value={c.name}
              placeholder="Enter the name you want shown"
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
                  if (role !== 'friend' && g.story.narratorId === c.id) delete g.story.narratorId;
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
        <div className="character-section-label">
          <span>02</span>
          <div>
            <strong>Appearance</strong>
            <small>Choose a built-in illustration or upload finished artwork.</small>
          </div>
        </div>
        <AvatarCreator
          value={c.avatar}
          onChange={(avatar) => update({ avatar, sprite: '' })}
          onSave={(avatar) => {
            update({ avatar, sprite: '' });
            notify(`${c.name}'s character is ready — save the adventure to keep it`);
          }}
        />
        <div className="upload-row">
          <div>
            <Image size={19} />
            <div>
              <strong>
                {c.sprite ? 'Custom character art in use' : 'Use custom character art'}
              </strong>
              <small>Transparent PNG or WebP gives the cleanest in-game result. Up to 10 MB.</small>
            </div>
          </div>
          <UploadButton
            label={uploading ? 'Uploading…' : c.sprite ? 'Replace art' : 'Upload art'}
            disabled={uploading}
            accept="image/png,image/jpeg,image/webp"
            onFile={async (file) => {
              setUploading(true);
              try {
                const id = c.id;
                const sprite = await attachAsset(file, 'image');
                change((g) => {
                  const character = g.characters.find((x) => x.id === id);
                  if (character) {
                    character.sprite = sprite;
                    delete character.avatar;
                  }
                });
                notify('Custom character art uploaded');
              } catch (error) {
                notify((error as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          />
        </div>
        {c.sprite && (
          <small className="muted">
            Selecting a library character switches back to built-in art.
          </small>
        )}
        {c.role !== 'hero' && (
          <>
            <div className="character-section-label">
              <span>03</span>
              <div>
                <strong>Gameplay</strong>
                <small>Tune how this character behaves during a level.</small>
              </div>
            </div>
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
          </>
        )}
      </div>
    </>
  );
}
