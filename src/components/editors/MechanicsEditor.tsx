import { mechanicsSchema } from '../../../shared/schema';
import { Field } from '../UI';
import type { EditorProps } from './types';
const groups = {
  'Punch, kick & beam': [
    'punchDamage',
    'kickDamage',
    'punchCooldown',
    'kickCooldown',
    'punchRange',
    'kickRange',
    'beamDamage',
    'beamRange',
    'stompDamage',
  ],
  'Survival & feedback': [
    'invincibility',
    'fallDamage',
    'aggressionRange',
    'healthDrops',
    'healthBars',
    'screenShake',
    'combos',
  ],
  'Drops & companions': [
    'powerupChance',
    'powerupLimit',
    'pickupDelay',
    'helperDuration',
    'beamDuration',
    'boostDuration',
    'boostMultiplier',
    'helpersAtStart',
  ],
} as const;
const labels: Record<string, string> = {
  invincibility: 'Invincibility after damage (seconds)',
  aggressionRange: 'Enemy attack awareness range',
  powerupChance: 'Power-up drop probability (0–1)',
  powerupLimit: 'Maximum power-up drops per chapter',
  pickupDelay: 'Pickup delay (seconds)',
  helperDuration: 'Companions duration (seconds)',
  beamDuration: 'Beam power-up duration (seconds)',
  boostDuration: 'Damage boost duration (seconds)',
  helpersAtStart: 'Summon helpers at chapter start',
  combos: 'Mixed-attack combos and score',
  healthDrops: 'Enemies drop health refills',
  screenShake: 'Attack screen shake',
  healthBars: 'Enemy health bars',
};
export function MechanicsEditor({ game, change }: EditorProps) {
  const mechanics = mechanicsSchema.parse(game.mechanics || {});
  return (
    <details className="advanced-settings">
      <summary>Advanced gameplay</summary>
      {Object.entries(groups).map(([title, keys]) => (
        <div className="form-card" key={title}>
          <h3>{title}</h3>
          <div className="mechanics-grid">
            {keys.map((key) => {
              const value = mechanics[key];
              const label =
                labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
              const schema = mechanicsSchema.shape[key]._def.innerType;
              const checks =
                'checks' in schema._def
                  ? (schema._def.checks as { kind: string; value?: number }[])
                  : [];
              return (
                <Field key={key} label={label}>
                  <input
                    aria-label={label}
                    type={typeof value === 'boolean' ? 'checkbox' : 'number'}
                    checked={typeof value === 'boolean' ? value : undefined}
                    value={typeof value === 'number' ? value : undefined}
                    min={checks.find((c) => c.kind === 'min')?.value}
                    max={checks.find((c) => c.kind === 'max')?.value}
                    step={checks.some((c) => c.kind === 'int') ? 1 : 'any'}
                    onChange={(e) => {
                      const next =
                        typeof value === 'boolean' ? e.target.checked : Number(e.target.value);
                      change((g) => {
                        g.mechanics = { ...mechanics, [key]: next };
                      });
                    }}
                  />
                </Field>
              );
            })}
          </div>
        </div>
      ))}
    </details>
  );
}
