import { accessToken, supabase } from './auth';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let activeProject: string | null = null;
export function setUploadProject(id: string | null) {
  activeProject = id;
}
export async function requestHeaders() {
  const token = await accessToken();
  return {
    'X-game-gift-Request': 'studio',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
export async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  if (supabase && url === '/auth/logout') {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { ok: true } as T;
  }
  const res = await fetch(`${API_BASE_URL}/api${url}`, {
    signal: AbortSignal.timeout(30000),
    credentials: supabase ? 'omit' : 'include',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(await requestHeaders()),
      ...options.headers,
    },
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('The server is unavailable. Your draft is still here.', res.status);
  }
  if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status);
  if (supabase && url === '/auth/account' && options.method === 'DELETE')
    await supabase.auth.signOut({ scope: 'local' });
  return data;
}
export async function downloadProject(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(id)}/export`, {
    signal: AbortSignal.timeout(30000),
    credentials: 'omit',
    headers: await requestHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error || 'Export failed', res.status);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'experience.game-gift.json';
  return { blob: await res.blob(), filename };
}
export async function uploadAsset(file: File, kind: 'image' | 'audio') {
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB');
  if (!file.type.startsWith(kind + '/')) throw new Error(`Choose an ${kind} file`);
  if (supabase && !activeProject) throw new Error('Save your game before uploading media.');
  const form = new FormData();
  form.append('file', file);
  const result = await api<{ url: string; mime: string }>('/assets', {
    method: 'POST',
    body: form,
    headers: activeProject ? { 'X-Project-Id': activeProject } : {},
  });
  if (!result.mime.startsWith(kind + '/')) throw new Error(`Choose an ${kind} file`);
  return result.url;
}
/** Hosted upload when a project exists; otherwise a local blob so art still appears in play. */
export async function attachAsset(file: File, kind: 'image' | 'audio') {
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB');
  if (!file.type.startsWith(kind + '/')) throw new Error(`Choose an ${kind} file`);
  if (!activeProject) return URL.createObjectURL(file);
  return uploadAsset(file, kind);
}
