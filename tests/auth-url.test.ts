import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authCallbackUrl } from '../src/auth-url';

test('OAuth callback stays on the browser origin that owns the PKCE verifier', () => {
  assert.equal(
    authCallbackUrl('https://game-gift.shop/auth/callback', 'https://www.game-gift.shop'),
    'https://www.game-gift.shop/auth/callback',
  );
  assert.equal(
    authCallbackUrl('/auth/callback', 'http://localhost:5173'),
    'http://localhost:5173/auth/callback',
  );
  assert.equal(
    authCallbackUrl('not a valid URL', 'http://localhost:5173'),
    'http://localhost:5173/auth/callback',
  );
});
