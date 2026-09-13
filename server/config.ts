/** Fail closed before binding a production listener. */
export function validateEnvironment(env: NodeJS.ProcessEnv = process.env) {
  if (env.TRUST_PROXY && !/^[0-9]$/.test(env.TRUST_PROXY))
    throw new Error('TRUST_PROXY must be a proxy hop count from 0 to 9');
  if (Boolean(env.SUPABASE_URL) !== Boolean(env.SUPABASE_SERVICE_ROLE_KEY))
    throw new Error('Configure both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  if (env.SUPABASE_URL) {
    const url = new URL(env.SUPABASE_URL);
    if (url.protocol !== 'https:' || url.origin !== env.SUPABASE_URL)
      throw new Error('SUPABASE_URL must be an exact HTTPS origin');
  }
  if (env.AUTH_PROVIDER && !['legacy', 'supabase'].includes(env.AUTH_PROVIDER))
    throw new Error('Invalid AUTH_PROVIDER');
  if (
    env.AUTH_PROVIDER === 'supabase' &&
    (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY)
  )
    throw new Error('Supabase Auth requires URL, anon key and service role key');
  if (
    env.PUBLISH_PRICE_AMOUNT &&
    (!/^\d+$/.test(env.PUBLISH_PRICE_AMOUNT) ||
      Number(env.PUBLISH_PRICE_AMOUNT) < 100 ||
      Number(env.PUBLISH_PRICE_AMOUNT) > 10000000)
  )
    throw new Error('Invalid PUBLISH_PRICE_AMOUNT');
  if (env.NODE_ENV !== 'production') return;
  if (env.AUTH_PROVIDER !== 'supabase')
    throw new Error('Production requires Supabase Auth and private Storage');
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('Production requires private Storage');
  if (!env.DATABASE_URL) throw new Error('Production requires DATABASE_URL');
  const origin = new URL(env.APP_ORIGIN || '');
  if (origin.protocol !== 'https:' || origin.origin !== env.APP_ORIGIN)
    throw new Error('APP_ORIGIN must be an exact HTTPS origin without a trailing slash');
  if (env.PAYMENTS_ENABLED === 'false') throw new Error('Production publishing requires payments');
  for (const origin of (env.CORS_ORIGINS || env.APP_ORIGIN || '').split(',')) {
    const parsed = new URL(origin.trim());
    if (parsed.protocol !== 'https:' || parsed.origin !== origin.trim())
      throw new Error('CORS_ORIGINS requires exact HTTPS origins');
  }
}

/** Local loopback origins are allowed only during development; production remains exact. */
export function trustedOrigin(origin: string, env: NodeJS.ProcessEnv = process.env) {
  if (
    [
      env.APP_ORIGIN || 'http://localhost:5173',
      ...(env.CORS_ORIGINS || '').split(',').map((s) => s.trim()),
    ].includes(origin)
  )
    return true;
  if (env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    return (
      url.origin === origin &&
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
