import { memo, useEffect, useMemo, useState } from 'react';
import {
  avatarCacheKey,
  resolveAvatarLayers,
  safeAvatar,
  type AvatarConfig,
} from '../../../shared/avatar';

export const AvatarRenderer = memo(function AvatarRenderer({
  config,
  className = '',
  label = 'Custom character',
}: {
  config?: AvatarConfig;
  className?: string;
  label?: string;
}) {
  const valid = useMemo(() => safeAvatar(config), [config]);
  const layers = useMemo(() => resolveAvatarLayers(valid), [valid]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => setLoaded(false), [valid]);
  return (
    <div
      className={`avatar-renderer ${loaded ? 'loaded' : 'loading'} ${className}`}
      role="img"
      aria-label={label}
      data-avatar-key={avatarCacheKey(valid)}
    >
      <span className="avatar-loading">Making magic…</span>
      {layers.map((layer, index) => (
        <img
          key={`${layer.src}-${index}`}
          src={layer.src}
          alt=""
          draggable={false}
          loading={index < 8 ? 'eager' : 'lazy'}
          onLoad={() => index === layers.length - 1 && setLoaded(true)}
          style={{
            left: layer.x,
            top: layer.y,
            width: layer.width,
            transform: layer.flipX ? 'scaleX(-1)' : undefined,
          }}
        />
      ))}
    </div>
  );
});
