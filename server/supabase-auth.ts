import type { DB } from './db';
export const supabaseAuthEnabled = () => process.env.AUTH_PROVIDER === 'supabase';
const denied = () =>
  Object.assign(new Error('Sign in again with a verified email'), { status: 401 });
/** Auth service verifies signature, expiry and user existence; never decode and trust a JWT. */
export async function supabaseIdentity(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) throw denied();
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY!, Authorization: authorization },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status >= 500)
      throw Object.assign(new Error('Authentication unavailable'), { status: 503 });
    throw denied();
  }
  const user = (await response.json()) as any;
  if (!user.id || !user.email || !user.email_confirmed_at || user.is_anonymous) throw denied();
  return {
    id: String(user.id),
    email: String(user.email).toLowerCase(),
    name: String(user.user_metadata?.name || user.email.split('@')[0]).slice(0, 60),
  };
}
export async function authenticateSupabase(db: DB, authorization: string | undefined) {
  const user = await supabaseIdentity(authorization);
  return db.transaction(async (q) => {
    if ((await q('SELECT id FROM deleted_accounts WHERE id=$1', [user.id])).length) throw denied();
    // Never auto-link an existing legacy account by email.
    await q(
      "INSERT INTO users(id,email,password,name,auth_provider) VALUES ($1,$2,'!supabase',$3,'supabase') ON CONFLICT(id) DO NOTHING",
      [user.id, user.email, user.name],
    );
    const [profile] = await q('SELECT id,email,name,auth_provider FROM users WHERE id=$1', [
      user.id,
    ]);
    if (profile.auth_provider !== 'supabase') throw denied();
    await q(
      "INSERT INTO email_outbox(id,user_id,kind,payload,created_at) VALUES ($1,$2,'welcome','{}',$3) ON CONFLICT DO NOTHING",
      [`welcome-${user.id}`, user.id, new Date().toISOString()],
    );
    return { id: profile.id, email: user.email, name: profile.name };
  });
}
export async function removeSupabaseAccount(id: string) {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok && response.status !== 404) throw new Error('Account provider deletion failed');
}
