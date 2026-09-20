import { defaultBoss } from '../../../shared/runtime';
import {
  applyDifficultyPreset,
  difficultyPresets,
  type DifficultyMode,
} from '../../../shared/template';
import { Field } from '../UI';
import { UploadButton } from '../UI';
import { attachAsset } from '../../api';
import type { EditorProps } from './types';
export function EncounterEditor({ game, change, level, notify }: EditorProps & { level: number }) {
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
      <Field
        label="Number of villains"
        hint="Choose exactly how many villains appear in this chapter (0–200)."
      >
        <div className="number-stepper">
          <button
            type="button"
            className="secondary"
            aria-label="Remove one villain"
            disabled={l.enemyCount <= 0}
            onClick={() =>
              change((g) => {
                g.levels[level].enemyCount = Math.max(0, l.enemyCount - 1);
                g.levels[level].difficulty = 'custom';
              })
            }
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={200}
            inputMode="numeric"
            value={l.enemyCount}
            aria-label="Number of villains"
            onChange={(e) =>
              change((g) => {
                g.levels[level].enemyCount = Math.max(0, Math.min(200, Number(e.target.value)));
                g.levels[level].difficulty = 'custom';
              })
            }
          />
          <button
            type="button"
            className="secondary"
            aria-label="Add one villain"
            disabled={l.enemyCount >= 200 || !enemies.length}
            onClick={() =>
              change((g) => {
                g.levels[level].enemyCount = Math.min(200, l.enemyCount + 1);
                g.levels[level].difficulty = 'custom';
              })
            }
          >
            +
          </button>
        </div>
        {!enemies.length && (
          <p className="muted">Add a villain character before placing villains.</p>
        )}
      </Field>
      <div className="form-grid">
        <Field
          label="Villain intelligence"
          hint="All villains chase and attack the hero. Smart villains also navigate platforms and avoid pits."
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
            <option value="low">Standard · direct chase</option>
            <option value="high">Smart · navigates obstacles</option>
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
              ['motorcycle', 'Hidden phone · motorcycle sweep'],
              ['mixed', 'Cycle through all four'],
            ].map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Motorcycle power-up art"
          hint="Replace the built-in rider artwork used for the hidden-phone motorcycle power-up."
        >
          <div className="inline-actions">
            <UploadButton
              label={l.motorcycleArt ? 'Replace motorcycle art' : 'Upload motorcycle art'}
              accept="image/png,image/jpeg,image/webp"
              onFile={async (file) => {
                const levelId = l.id;
                try {
                  const url = await attachAsset(file, 'image');
                  change((g) => {
                    const chapter = g.levels.find((item) => item.id === levelId);
                    if (chapter) chapter.motorcycleArt = url;
                  });
                } catch (error) {
                  notify((error as Error).message);
                }
              }}
            />
            {l.motorcycleArt && (
              <button
                type="button"
                className="secondary"
                onClick={() => change((g) => delete g.levels[level].motorcycleArt)}
              >
                Use built-in rider
              </button>
            )}
          </div>
        </Field>
        <Field
          label="Custom power-up art"
          hint="Upload the artwork shown for every power-up drop in this chapter."
        >
          <div className="inline-actions">
            <UploadButton
              label={l.powerupArt ? 'Replace artwork' : 'Upload artwork'}
              accept="image/png,image/jpeg,image/webp"
              onFile={async (file) => {
                const levelId = l.id;
                try {
                  const url = await attachAsset(file, 'image');
                  change((g) => {
                    const chapter = g.levels.find((item) => item.id === levelId);
                    if (chapter) chapter.powerupArt = url;
                  });
                } catch (error) {
                  notify((error as Error).message);
                }
              }}
            />
            {l.powerupArt && (
              <button
                type="button"
                className="secondary"
                onClick={() => change((g) => delete g.levels[level].powerupArt)}
              >
                Use built-in art
              </button>
            )}
          </div>
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
