import { defaultBoss } from '../../../shared/runtime';
import {
  applyDifficultyPreset,
  difficultyPresets,
  type DifficultyMode,
} from '../../../shared/template';
import { Field } from '../UI';
import type { EditorProps } from './types';
export function EncounterEditor({ game, change, level }: EditorProps & { level: number }) {
  const l = game.levels[level],
    boss = { ...defaultBoss, ...l.boss };
  const enemies = game.characters.filter((c) => c.role === 'enemy');
  return (
    <div className="form-card">
      <h3>Encounters, rewards & hazards</h3>
      <Field
        label="Challenge mode"
        hint="Choose a starting point, then fine-tune any setting below."
      >
        <div className="preset-buttons">
          {(Object.keys(difficultyPresets) as DifficultyMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              className={l.difficulty === mode ? 'primary' : 'secondary'}
              onClick={() =>
                change((g) => applyDifficultyPreset(g.levels[level], mode, enemies[0]?.id))
              }
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
          {l.difficulty === 'custom' && <span className="muted">Custom</span>}
        </div>
      </Field>
      <div className="form-grid">
        <Field
          label="Enemy pit awareness"
          hint="Low-IQ enemies can run into pits; high-IQ enemies stop or jump."
        >
          <select
            value={l.enemyIq || 'low'}
            onChange={(e) =>
              change((g) => {
                g.levels[level].enemyIq = e.target.value as 'low' | 'high';
                g.levels[level].difficulty = 'custom';
              })
            }
          >
            <option value="low">Low · may fall into pits</option>
            <option value="high">High · avoids pits</option>
          </select>
        </Field>
        <Field label="Exit rule">
          <select
            value={l.requireDefeatAll === false ? 'reach' : 'clear'}
            onChange={(e) =>
              change((g) => {
                g.levels[level].requireDefeatAll = e.target.value === 'clear';
              })
            }
          >
            <option value="clear">Defeat all enemies before leaving</option>
            <option value="reach">Reach the exit (boss still required)</option>
          </select>
        </Field>
        <Field label="Chapter power-up">
          <select
            value={l.powerup || 'mixed'}
            onChange={(e) =>
              change((g) => {
                g.levels[level].powerup = e.target.value as typeof l.powerup;
                g.levels[level].difficulty = 'custom';
              })
            }
          >
            {[
              ['none', 'No power-ups'],
              ['companion', 'Summon companions'],
              ['beam', 'Energy beam'],
              ['boost', 'Damage boost'],
              ['mixed', 'Cycle through all three'],
            ].map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Final boss">
          <input
            type="checkbox"
            checked={boss.enabled}
            disabled={!enemies.length}
            onChange={(e) =>
              change((g) => {
                g.levels[level].boss = {
                  ...boss,
                  enabled: e.target.checked,
                  characterId: boss.characterId || enemies[0]?.id,
                };
              })
            }
          />
        </Field>
      </div>
      {boss.enabled && (
        <div className="form-grid">
          <Field label="Boss character">
            <select
              value={boss.characterId || enemies[0]?.id}
              onChange={(e) =>
                change((g) => {
                  g.levels[level].boss = { ...boss, characterId: e.target.value };
                })
              }
            >
              {enemies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Boss name">
            <input
              value={boss.name}
              maxLength={60}
              onChange={(e) =>
                change((g) => {
                  g.levels[level].boss = { ...boss, name: e.target.value };
                })
              }
            />
          </Field>
          {(['health', 'damage', 'enrageAt', 'armor'] as const).map((k) => (
            <Field
              key={k}
              label={
                {
                  health: 'Boss health',
                  damage: 'Boss attack damage',
                  enrageAt: 'Enrage below health fraction',
                  armor: 'Damage taken outside recovery (fraction)',
                }[k]
              }
            >
              <input
                type="number"
                step="any"
                value={boss[k]}
                min={k === 'health' ? 1 : 0.05}
                max={k === 'health' ? 5000 : k === 'damage' ? 10 : 1}
                onChange={(e) =>
                  change((g) => {
                    g.levels[level].boss = { ...boss, [k]: Number(e.target.value) };
                  })
                }
              />
            </Field>
          ))}
          <p className="muted">
            Alternates a telegraphed shoulder rush and ground slam. Jump to evade; strike during
            recovery. Enrage accelerates the fight.
          </p>
        </div>
      )}
      <div className="section-top compact">
        <h3>Ground pits</h3>
        <button
          className="secondary"
          disabled={(l.holes?.length || 0) >= 20}
          onClick={() =>
            change((g) => {
              g.levels[level].holes = [
                ...(l.holes || []),
                { x: Math.min(l.width - 400, 600 + (l.holes?.length || 0) * 300), width: 120 },
              ];
              g.levels[level].difficulty = 'custom';
            })
          }
        >
          Add pit
        </button>
      </div>
      <Field label="Add moving ferry crossings for wide pits">
        <input
          type="checkbox"
          checked={l.crossingPlatforms || false}
          onChange={(e) =>
            change((g) => {
              g.levels[level].crossingPlatforms = e.target.checked;
            })
          }
        />
      </Field>
      {(l.holes || []).map((hole, i) => (
        <div className="form-grid" key={i}>
          {(['x', 'width'] as const).map((k) => (
            <Field key={k} label={`Pit ${i + 1} ${k}`}>
              <input
                type="number"
                value={hole[k]}
                onChange={(e) =>
                  change((g) => {
                    g.levels[level].holes![i][k] = Number(e.target.value);
                    g.levels[level].difficulty = 'custom';
                  })
                }
              />
            </Field>
          ))}
          <button
            className="secondary"
            onClick={() =>
              change((g) => {
                g.levels[level].holes!.splice(i, 1);
                g.levels[level].difficulty = 'custom';
              })
            }
          >
            Remove pit {i + 1}
          </button>
        </div>
      ))}
    </div>
  );
}
