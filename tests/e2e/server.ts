import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { openDatabase } from '../../server/db';
import { createApp } from '../../server/app';
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = await mkdtemp(`${tmpdir()}/playcraft-browser-`);
process.env.APP_ORIGIN = 'http://127.0.0.1:4173';
process.env.REGISTRATION_CODE = 'browser-test-invitation-code-only';
delete process.env.DATABASE_URL;
delete process.env.OPENAI_API_KEY;
const db = await openDatabase();
const server = createApp(db).listen(4173, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(async () => {
      await db.close();
      await rm(process.env.DATA_DIR!, { recursive: true, force: true });
      process.exit(0);
    });
  });
