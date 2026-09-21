import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { openDatabase } from '../../server/db';
import { createApp } from '../../server/app';
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = await mkdtemp(`${tmpdir()}/game-gift-browser-`);
process.env.APP_ORIGIN = 'http://127.0.0.1:4173';
delete process.env.DATABASE_URL;
delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_MODEL;
delete process.env.AUTH_PROVIDER;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_STORAGE_BUCKET;
const db = await openDatabase();
const testUsers = {
  'Bearer browser-desktop-token': {
    id: 'browser-desktop',
    email: 'browser-desktop@example.com',
    name: 'Browser Creator',
    age: 30,
  },
  'Bearer browser-mobile-token': {
    id: 'browser-mobile',
    email: 'browser-mobile@example.com',
    name: 'Browser Creator',
    age: 30,
  },
} as const;
for (const user of Object.values(testUsers))
  await db.query(
    "INSERT INTO users(id,email,password,name,age,auth_provider,auth_subject) VALUES ($1,$2,'!supabase',$3,$4,'supabase',$1)",
    [user.id, user.email, user.name, user.age],
  );
const server = createApp(db, {
  authenticate: async (authorization) => {
    const user = testUsers[authorization as keyof typeof testUsers];
    if (!user) throw Object.assign(new Error('Sign in again with Google'), { status: 401 });
    return { ...user, authSubject: user.id };
  },
}).listen(4173, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(async () => {
      await db.close();
      await rm(process.env.DATA_DIR!, { recursive: true, force: true });
      process.exit(0);
    });
  });
