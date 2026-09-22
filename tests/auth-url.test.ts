import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authCallbackUrl, hasAuthResponse } from '../src/auth-url';

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

test('OAuth responses are recognized even when Supabase returns them to the Site URL', () => {
  assert.equal(hasAuthResponse('?code=authorization-code', ''), true);
  assert.equal(hasAuthResponse('?error=access_denied', ''), true);
  assert.equal(hasAuthResponse('', '#access_token=token&refresh_token=refresh'), true);
  assert.equal(hasAuthResponse('?utm_source=google', '#section'), false);
});
