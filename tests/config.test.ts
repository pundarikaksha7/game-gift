import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnvironment } from '../server/config';
test('production fails closed on missing invitations and invalid origin/proxy configuration', () => {
  const valid = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/test',
    APP_ORIGIN: 'https://games.example.com',
    REGISTRATION_CODE: 'a'.repeat(32),
    TRUST_PROXY: '1',
  };
  assert.doesNotThrow(() => validateEnvironment(valid));
  for (const change of [
    { REGISTRATION_CODE: '' },
    { APP_ORIGIN: 'http://games.example.com' },
    { APP_ORIGIN: 'https://games.example.com/' },
    { APP_ORIGIN: 'https://games.example.com/path' },
    { TRUST_PROXY: 'true' },
    { DATABASE_URL: '' },
  ])
    assert.throws(() => validateEnvironment({ ...valid, ...change }));
});
