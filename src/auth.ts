import { createClient } from '@supabase/supabase-js';
export const supabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export async function accessToken() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token;
}
export async function authenticate(mode: 'login' | 'register', input: any) {
  if (!supabase) return null;
  const result = mode === 'register'
    ? await supabase.auth.signUp({ email: input.email, password: input.password, options: { data: { name: input.name }, emailRedirectTo: `${location.origin}/my-games` } })
    : await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error('Check your email to verify your account, then sign in.');
  return result.data;
}
