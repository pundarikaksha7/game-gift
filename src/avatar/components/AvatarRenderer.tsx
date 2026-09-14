import { memo, useEffect, useMemo, useState } from 'react';
import { avatarCacheKey, safeAvatar, type AvatarConfig } from '../../../shared/avatar';
import { composeAvatar } from '../compose';

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
  const key = avatarCacheKey(valid);
  const [state, setState] = useState<{ key: string; src?: string; failed?: boolean }>({ key });
  useEffect(() => {
    let current = true;
    setState((previous) => ({ key, src: previous.src }));
    composeAvatar(valid).then(
      (src) => current && setState({ key, src }),
      () => current && setState({ key, failed: true }),
    );
    return () => {
      current = false;
    };
  }, [key, valid]);
  const loading = state.key !== key || !state.src;
  return (
    <div
      className={`avatar-renderer ${loading ? 'loading' : 'loaded'} ${className}`}
      role="img"
      aria-label={label}
      aria-busy={loading}
      data-avatar-key={key}
    >
      {state.src && <img className="avatar-composite" src={state.src} alt="" draggable={false} />}
      {loading && (
        <span className="avatar-loader" aria-label="Loading character">
          <i className="avatar-loader-orbit" />
          <strong>Building your character</strong>
          <small>Fitting the final details…</small>
        </span>
      )}
      {state.failed && <span className="avatar-error">Preview unavailable</span>}
    </div>
  );
});
