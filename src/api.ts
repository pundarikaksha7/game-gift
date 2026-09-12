export async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${url}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      'X-Gamegift-Request': 'studio',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export async function uploadAsset(file: File, kind: 'image' | 'audio') {
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB');
  if (!file.type.startsWith(kind + '/')) throw new Error(`Choose an ${kind} file`);
  const form = new FormData();
  form.append('file', file);
  const result = await api<{ url: string; mime: string }>('/assets', {
    method: 'POST',
    body: form,
  });
  if (!result.mime.startsWith(kind + '/')) throw new Error(`Choose an ${kind} file`);
  return result.url;
}
