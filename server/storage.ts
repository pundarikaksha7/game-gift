import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

/** Keep storage private; all reads go through the API's ownership/publication check. */
function remote() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key, bucket: process.env.SUPABASE_STORAGE_BUCKET || 'game-gift-media' };
}
function localPath(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid asset identifier');
  return path.resolve(process.env.DATA_DIR || '.data', 'uploads', id);
}
async function storageRequest(id: string, method: string, payload?: Buffer, mime?: string) {
  const config = remote()!;
  if (
    !/^(?:users\/[a-f0-9-]{36}\/projects\/[a-f0-9-]{36}\/(?:characters|audio|animations)\/)?[a-f0-9-]{36}$/.test(
      id,
    )
  )
    throw new Error('Invalid storage key');
  const endpoint = `${config.url}/storage/v1/object/${method === 'GET' ? 'authenticated/' : ''}${encodeURIComponent(config.bucket)}/${id}`;
  const response = await fetch(endpoint, {
    method,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      ...(mime ? { 'Content-Type': mime } : {}),
      // Stable client-generated upload IDs make a timed-out upload safe to retry.
      'x-upsert': 'true',
    },
    body: payload ? new Uint8Array(payload) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok && !(method === 'DELETE' && response.status === 404)) {
    const providerBody = await response
      .clone()
      .text()
      .catch(() => '');
    let providerMessage = providerBody;
    try {
      const body = JSON.parse(providerBody);
      providerMessage = body.message || body.error || body.code || '';
    } catch {
      // Some provider and proxy errors are plain text.
    }
    throw Object.assign(new Error('Media storage is unavailable. Try again shortly.'), {
      status: 503,
      detail: `Supabase Storage ${method} failed (${response.status})${providerMessage ? `: ${providerMessage}` : ''}`,
    });
  }
  return response;
}
export async function putAsset(id: string, payload: Buffer, mime: string) {
  if (remote()) {
    await storageRequest(id, 'POST', payload, mime);
    return;
  }
  const filename = localPath(id);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, payload, { flag: 'wx' });
}
export async function readAsset(id: string) {
  if (remote()) return Buffer.from(await (await storageRequest(id, 'GET')).arrayBuffer());
  return readFile(localPath(id));
}
export async function deleteAsset(id: string) {
  if (remote()) {
    await storageRequest(id, 'DELETE');
    return;
  }
  try {
    await unlink(localPath(id));
  } catch (error: any) {
    if (error.code !== 'ENOENT') throw error;
  }
}
