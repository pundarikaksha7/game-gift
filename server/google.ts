import type express from 'express';
import { randomBytes, createHash } from 'node:crypto';

export const googleEnabled = () =>
  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
export function googleFlow() {
  const pending = new Map<string, { expires: number; password: string; invited: boolean }>();
  const callback = () =>
    `${process.env.APP_ORIGIN || 'http://localhost:5173'}/api/auth/google/callback`;
  return {
    start(res: express.Response, password: string, invited: boolean) {
      for (const [key, value] of pending) if (value.expires < Date.now()) pending.delete(key);
      if (pending.size >= 1000) throw new Error('Sign-in is busy. Try again shortly.');
      const state = randomBytes(32).toString('hex');
      pending.set(digest(state), { expires: Date.now() + 600000, password, invited });
      res.cookie('google_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600000,
        path: '/api/auth/google',
      });
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: callback(),
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
      }).toString();
      return url.toString();
    },
    async finish(req: express.Request, res: express.Response) {
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const data = pending.get(digest(state));
      pending.delete(digest(state));
      res.clearCookie('google_state', { path: '/api/auth/google' });
      if (
        !data ||
        data.expires < Date.now() ||
        state !== req.cookies.google_state ||
        typeof req.query.code !== 'string'
      )
        throw new Error(
          'Google sign-in expired or was cancelled. Return to the app and try again.',
        );
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        body: new URLSearchParams({
          code: req.query.code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: callback(),
          grant_type: 'authorization_code',
        }),
      });
      const token = await tokenRes.json();
      if (!tokenRes.ok || !token.access_token)
        throw new Error('Google could not complete sign-in.');
      const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(15000),
      });
      const profile = await profileRes.json();
      if (!profileRes.ok || !profile.sub || !profile.email || profile.email_verified !== true)
        throw new Error('Google must provide a verified email address.');
      return {
        ...data,
        sub: String(profile.sub),
        email: String(profile.email).toLowerCase(),
        name: String(profile.name || 'Creator').slice(0, 60),
      };
    },
  };
}
