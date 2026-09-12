import { unlink } from 'node:fs/promises';
import path from 'node:path';
import type { DB } from './db';

export async function maintain(db: DB) {
  await db.query('DELETE FROM sessions WHERE expires<$1', [Date.now()]);
  const files = await db.query('SELECT filename FROM deleted_files LIMIT 100');
  for (const { filename } of files) {
    try {
      await unlink(
        path.resolve(process.env.DATA_DIR || '.data', 'uploads', path.basename(filename)),
      );
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
    await db.query('DELETE FROM deleted_files WHERE filename=$1', [filename]);
  }
}
