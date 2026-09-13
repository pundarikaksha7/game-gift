import { removeSupabaseAccount } from './supabase-auth';
import { deliverEmails } from './email';
import { deleteAsset } from './storage';
import type { DB } from './db';
export async function maintain(db: DB) {
  await db.query('DELETE FROM sessions WHERE expires<$1', [Date.now()]);
  for (const { id } of await db.query(
    'SELECT id FROM deleted_accounts WHERE processed_at IS NULL LIMIT 10',
  )) {
    await removeSupabaseAccount(id);
    await db.query('UPDATE deleted_accounts SET processed_at=$1 WHERE id=$2', [
      new Date().toISOString(),
      id,
    ]);
  }
  await deliverEmails(db);
  const files = await db.query('SELECT filename FROM deleted_files LIMIT 100');
  for (const { filename } of files) {
    await deleteAsset(filename);
    await db.query('DELETE FROM deleted_files WHERE filename=$1', [filename]);
  }
}
