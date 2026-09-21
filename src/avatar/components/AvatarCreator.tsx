import { useState } from 'react';
import { Check, Dice5, RotateCcw, Sparkles } from 'lucide-react';
import {
  avatarPresets,
  defaultAvatar,
  randomizeAvatar,
  resolveAvatarAsset,
  safeAvatar,
  type AvatarConfig,
} from '../../../shared/avatar';
import { AvatarRenderer } from './AvatarRenderer';
import { MediaImage } from '../../media';

function OptionThumbnail({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={`avatar-option-thumb ${loaded ? 'loaded' : ''}`}>
      <i />
      <img src={src} alt="" loading="lazy" decoding="async" onLoad={() => setLoaded(true)} />
    </span>
  );
}

export function AvatarCreator({
  value,
  customArt,
  onChange,
  onSave,
}: {
  value?: AvatarConfig;
  customArt?: string;
  onChange: (config: AvatarConfig) => void;
  onSave: (config: AvatarConfig) => void;
}) {
  const config = safeAvatar(value);
  return (
    <section className="avatar-creator" aria-label="Character creator">
      <div className="avatar-creator-layout">
        <div className="avatar-creator-stage">
          <div className="avatar-stage-copy">
            <span className="avatar-eyebrow">
              <Sparkles size={13} /> Character library
            </span>
            <h3>Current look</h3>
          </div>
          <div className="avatar-stage-preview">
            {customArt ? (
              <MediaImage src={customArt} alt="Uploaded character preview" />
            ) : (
              <AvatarRenderer config={config} label="Selected character preview" />
            )}
          </div>
          {customArt && <span className="custom-art-status">✓ Custom art loaded</span>}
          <div className="avatar-actions">
            <button type="button" className="secondary" onClick={() => onChange(randomizeAvatar())}>
              <Dice5 size={16} /> Surprise me
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => onChange(structuredClone(defaultAvatar))}
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>
        <div className="avatar-library">
          <div className="avatar-library-heading">
            <div>
              <strong>Choose a style</strong>
              <small>{avatarPresets.length} game-ready characters</small>
            </div>
            <button type="button" className="avatar-done" onClick={() => onSave(config)}>
              <Check size={15} /> Use selection
            </button>
          </div>
          <div className="avatar-option-grid" aria-label="Available characters" tabIndex={0}>
            {avatarPresets.map((option, index) => {
              const selected = !customArt && config.appearance === option.appearance;
              return (
                <button
                  type="button"
                  className={selected ? 'selected' : ''}
                  aria-pressed={selected}
                  aria-label={`Character ${String(index + 1).padStart(2, '0')}`}
                  key={option.appearance}
                  onClick={() => onChange(option)}
                >
                  <OptionThumbnail src={resolveAvatarAsset(option)} />
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {selected && <Check className="avatar-option-check" size={14} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
