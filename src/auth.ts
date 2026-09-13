import { createClient } from '@supabase/supabase-js';
type SupabaseClient = ReturnType<typeof createClient>;
export let supabase: SupabaseClient | null = null;

export function configureSupabase(url?: string, key?: string) {
  if (supabase || !url || !key) return supabase;
  supabase = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return supabase;
}

configureSupabase(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
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
          options: { data: { name: input.name }, emailRedirectTo: `${location.origin}/my-games` },
        })
      : await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (result.error) throw result.error;
  if (!result.data.session)
    throw new Error('Check your email to verify your account, then sign in.');
  return result.data;
}
