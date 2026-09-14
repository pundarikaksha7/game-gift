import { useMemo, useState } from 'react';
import { Dice5, RotateCcw, Sparkles } from 'lucide-react';
import {
  avatarCatalog,
  avatarPresets,
  defaultAvatar,
  randomizeAvatar,
  safeAvatar,
  type AvatarConfig,
} from '../../../shared/avatar';
import { AvatarRenderer } from './AvatarRenderer';

type EditableCategory =
  'skinTone' | 'hair' | 'hairColor' | 'eyes' | 'mouth' | 'top' | 'bottom' | 'shoes';
const groups: { id: 'presets' | EditableCategory; label: string }[] = [
  { id: 'presets', label: 'Presets' },
  { id: 'skinTone', label: 'Skin' },
  { id: 'hair', label: 'Hair' },
  { id: 'hairColor', label: 'Color' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'mouth', label: 'Smile' },
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'shoes', label: 'Shoes' },
];
const friendly = (id: string) =>
  id.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AvatarCreator({
  value,
  onChange,
  onSave,
}: {
  value?: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  onSave: () => void;
}) {
  const [category, setCategory] = useState<(typeof groups)[number]['id']>('presets');
  const config = useMemo(() => safeAvatar(value), [value]);
  const options = category === 'presets' ? avatarPresets : avatarCatalog[category];
  return (
    <section className="avatar-creator" aria-label="Character creator">
      <div className="avatar-creator-stage">
        <div>
          <span className="avatar-eyebrow">
            <Sparkles size={13} /> Your character
          </span>
          <h3>Make them feel familiar</h3>
        </div>
        <AvatarRenderer config={config} label="Live character preview" />
      </div>
      <div className="avatar-category-tabs" role="tablist" aria-label="Customization categories">
        {groups.map((group) => (
          <button
            type="button"
            role="tab"
            aria-selected={category === group.id}
            className={category === group.id ? 'active' : ''}
            key={group.id}
            onClick={() => setCategory(group.id)}
          >
            {group.label}
          </button>
        ))}
      </div>
      <div className="avatar-option-grid">
        {options.map((option, index) => {
          const next =
            category === 'presets'
              ? (option as AvatarConfig)
              : ({ ...config, [category]: option, preset: undefined } as AvatarConfig);
          const selected =
            category === 'presets'
              ? config.preset === (option as AvatarConfig).preset
              : config[category] === option;
          return (
            <button
              type="button"
              className={selected ? 'selected' : ''}
              aria-pressed={selected}
              key={category === 'presets' ? (option as AvatarConfig).preset : String(option)}
              onClick={() => onChange(next)}
            >
              <AvatarRenderer config={next} label="" />
              <span>
                {category === 'presets'
                  ? `Look ${String(index + 1).padStart(2, '0')}`
                  : friendly(String(option))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="avatar-actions">
        <button type="button" className="secondary" onClick={() => onChange(randomizeAvatar())}>
          <Dice5 size={16} /> Randomize
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => onChange(structuredClone(defaultAvatar))}
        >
          <RotateCcw size={15} /> Reset
        </button>
        <button type="button" className="primary" onClick={onSave}>
          Save character
        </button>
      </div>
    </section>
  );
}
