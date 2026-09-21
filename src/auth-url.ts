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
