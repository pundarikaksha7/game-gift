/** Fail closed before binding a production listener. */
export function validateEnvironment(env: NodeJS.ProcessEnv = process.env) {
  if (env.TRUST_PROXY && !/^[0-9]$/.test(env.TRUST_PROXY))
    throw new Error('TRUST_PROXY must be a proxy hop count from 0 to 9');
  if (env.NODE_ENV !== 'production') return;
  if (!env.DATABASE_URL) throw new Error('Production requires DATABASE_URL');
  const origin = new URL(env.APP_ORIGIN || '');
  if (origin.protocol !== 'https:' || origin.origin !== env.APP_ORIGIN)
    throw new Error('APP_ORIGIN must be an exact HTTPS origin without a trailing slash');
  if (!env.REGISTRATION_CODE || env.REGISTRATION_CODE.length < 32)
    throw new Error('Production requires a REGISTRATION_CODE of at least 32 characters');
}
