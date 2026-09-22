export function authCallbackUrl(configuredUrl: string | undefined, browserOrigin: string) {
  const localCallback = new URL('/auth/callback', browserOrigin);
  if (!configuredUrl) return localCallback.toString();
  try {
    const configured = new URL(configuredUrl, browserOrigin);
    return configured.origin === localCallback.origin && configured.pathname === '/auth/callback'
      ? configured.toString()
      : localCallback.toString();
  } catch {
    return localCallback.toString();
  }
}

export function hasAuthResponse(search: string, hash: string) {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return (
    query.has('code') ||
    query.has('error') ||
    query.has('error_description') ||
    fragment.has('access_token') ||
    fragment.has('error') ||
    fragment.has('error_description')
  );
}

export function frontendSurface(
  path: string,
  isMarketingPath: boolean,
  search: string,
  hash: string,
): 'landing' | 'marketing' | 'app' {
  if (!isMarketingPath || hasAuthResponse(search, hash)) return 'app';
  return path === '/' ? 'landing' : 'marketing';
}
