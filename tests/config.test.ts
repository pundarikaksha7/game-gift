import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnvironment } from '../server/config';
test('production fails closed on missing auth storage and invalid origin/proxy configuration', () => {
  const valid = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/test',
    APP_ORIGIN: 'https://games.example.com',
    TRUST_PROXY: '1',
    AUTH_PROVIDER: 'supabase',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
  };
  assert.doesNotThrow(() => validateEnvironment(valid));
  for (const change of [
    { AUTH_PROVIDER: 'legacy' },
    { SUPABASE_URL: '' },
    { APP_ORIGIN: 'http://games.example.com' },
    { APP_ORIGIN: 'https://games.example.com/' },
    { APP_ORIGIN: 'https://games.example.com/path' },
    { TRUST_PROXY: 'true' },
    { DATABASE_URL: '' },
  ])
    assert.throws(() => validateEnvironment({ ...valid, ...change }));
});

test('loopback development origins work without relaxing production CSRF protection', async () => {
  const { trustedOrigin } = await import('../server/config');
  for (const origin of [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://[::1]:5173',
  ]) {
    assert.equal(trustedOrigin(origin, { NODE_ENV: 'development' }), true);
    assert.equal(
      trustedOrigin(origin, { NODE_ENV: 'production', APP_ORIGIN: 'https://games.example.com' }),
      false,
    );
  }
  for (const origin of [
    'null',
    'http://localhost.evil.com:5173',
    'https://evil.com',
    'http://localhost:5173/path',
  ])
    assert.equal(trustedOrigin(origin, { NODE_ENV: 'development' }), false);
  assert.equal(
    trustedOrigin('https://games.example.com', {
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://games.example.com',
    }),
    true,
  );
});
