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
    if (
      (
        await q('SELECT id FROM deleted_accounts WHERE id=$1 OR auth_subject=$2', [
          user.id,
          user.id,
        ])
      ).length
    )
      throw denied();
    let [profile] = await q(
      'SELECT id,email,name,auth_provider,auth_subject FROM users WHERE auth_subject=$1',
      [user.id],
    );
    if (profile)
      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        authSubject: profile.auth_subject,
      };
    // A verified Google email can claim its matching legacy profile without changing the
    // application user ID, which keeps all project, asset, and purchase foreign keys intact.
    await q(
      `INSERT INTO users(id,email,password,name,auth_provider,auth_subject)
       VALUES ($1,$2,'!supabase',$3,'supabase',$4)
       ON CONFLICT(email) DO UPDATE SET
         password=CASE WHEN users.auth_provider='legacy' THEN '!supabase' ELSE users.password END,
         auth_provider=CASE WHEN users.auth_provider='legacy' THEN 'supabase' ELSE users.auth_provider END,
         auth_subject=CASE WHEN users.auth_provider='legacy' THEN EXCLUDED.auth_subject ELSE users.auth_subject END`,
      [user.id, user.email, user.name, user.id],
    );
    [profile] = await q(
      'SELECT id,email,name,auth_provider,auth_subject FROM users WHERE email=$1',
      [user.email],
    );
    if (profile?.auth_provider !== 'supabase' || profile.auth_subject !== user.id) throw denied();
    await q(
      "INSERT INTO email_outbox(id,user_id,kind,payload,created_at) VALUES ($1,$2,'welcome','{}',$3) ON CONFLICT DO NOTHING",
      [`welcome-${profile.id}`, profile.id, new Date().toISOString()],
    );
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      authSubject: profile.auth_subject,
    };
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
