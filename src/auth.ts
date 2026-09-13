import { createClient } from '@supabase/supabase-js';
type SupabaseClient = ReturnType<typeof createClient>;
export let supabase: SupabaseClient | null = null;
let authRedirectUrl: string | undefined;

export function configureSupabase(url?: string, key?: string, redirectUrl?: string) {
  authRedirectUrl = redirectUrl || authRedirectUrl;
  if (supabase || !url || !key) return supabase;
  supabase = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return supabase;
}

configureSupabase(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
function redirectTo() {
  return authRedirectUrl || `${location.origin}/auth/callback`;
}

export async function completeAuthRedirect() {
  if (!supabase) return false;
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(location.search);
  const callbackError = hash.get('error_description') || query.get('error_description');
  if (callbackError) {
    history.replaceState(null, '', '/my-games');
    throw new Error(callbackError);
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const hasAuthResponse =
    location.pathname === '/auth/callback' ||
    location.hash.includes('access_token=') ||
    query.has('code');
  if (hasAuthResponse && data.session) history.replaceState(null, '', '/my-games');
  return Boolean(data.session);
}

export async function accessToken() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token;
}
export async function authenticate(mode: 'login' | 'register', input: any) {
  if (!supabase) throw new Error('Supabase Auth is not configured.');
  const result =
    mode === 'register'
      ? await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: { name: input.name }, emailRedirectTo: redirectTo() },
        })
      : await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (result.error) throw result.error;
  if (!result.data.session)
    throw new Error('Check your email to verify your account, then sign in.');
  return result.data;
}

export async function authenticateWithGoogle() {
  if (!supabase) throw new Error('Supabase Auth is not configured.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo() },
  });
  if (error) throw error;
  return data;
}
