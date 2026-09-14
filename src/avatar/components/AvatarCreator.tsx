import { useState } from 'react';
import { Dice5, RotateCcw, Sparkles } from 'lucide-react';
import {
  avatarPresets,
  defaultAvatar,
  randomizeAvatar,
  resolveAvatarAsset,
  safeAvatar,
  type AvatarConfig,
} from '../../../shared/avatar';
import { AvatarRenderer } from './AvatarRenderer';

function OptionThumbnail({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return <span className={`avatar-option-thumb ${loaded ? 'loaded' : ''}`}><i />
    <img src={src} alt="" loading="lazy" decoding="async" onLoad={() => setLoaded(true)} />
  </span>;
}

export function AvatarCreator({ value, onChange, onSave }: {
  value?: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  onSave: (config: AvatarConfig) => void;
}) {
  const config = safeAvatar(value);
  return <section className="avatar-creator" aria-label="Character creator">
    <div className="avatar-creator-stage">
      <div>
        <span className="avatar-eyebrow"><Sparkles size={13} /> Character library</span>
        <h3>Pick your character</h3>
        <p className="muted">Every design comes directly from the same illustrated sprite sheet.</p>
      </div>
      <div className="avatar-stage-preview">
        <AvatarRenderer config={config} label="Selected character preview" />
      </div>
    </div>
    <div className="avatar-option-grid" aria-label="Available characters">
      {avatarPresets.map((option, index) => {
        const selected = config.appearance === option.appearance;
        return <button type="button" className={selected ? 'selected' : ''} aria-pressed={selected}
          key={option.appearance} onClick={() => onChange(option)}>
          <OptionThumbnail src={resolveAvatarAsset(option)} />
          <span>Character {String(index + 1).padStart(2, '0')}</span>
        </button>;
      })}
    </div>
    <div className="avatar-actions">
      <button type="button" className="secondary" onClick={() => onChange(randomizeAvatar())}>
        <Dice5 size={16} /> Randomize
      </button>
      <button type="button" className="text-button" onClick={() => onChange(structuredClone(defaultAvatar))}>
        <RotateCcw size={15} /> Reset
      </button>
      <button type="button" className="primary" onClick={() => onSave(config)}>Save character</button>
    </div>
  </section>;
}
