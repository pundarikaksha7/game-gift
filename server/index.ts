import { openDatabase } from './db';
import { createApp } from './app';
import { validateEnvironment } from './config';
import { maintain } from './maintenance';
validateEnvironment();
const db = await openDatabase();
await maintain(db);
let maintaining = false;
const maintenance = setInterval(async () => {
  if (maintaining) return;
  maintaining = true;
  try {
    await maintain(db);
  } catch {
    console.error('Maintenance failed; will retry');
  } finally {
    maintaining = false;
  }
}, 60000);
maintenance.unref();
const server = createApp(db).listen(Number(process.env.PORT || 3001), '0.0.0.0', () =>
  console.log(`Gamegift API listening on ${process.env.PORT || 3001}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    clearInterval(maintenance);
    server.close(() => void db.close().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
