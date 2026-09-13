import { migrations } from './migrations';
import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { mkdirSync } from 'node:fs';
import { postgresPoolConfig } from './postgres-ssl';
export type Query = (sql: string, args?: unknown[]) => Promise<any[]>;
export type DB = {
  query: Query;
  transaction: <T>(fn: (q: Query) => Promise<T>) => Promise<T>;
  close: () => Promise<void>;
};
export async function openDatabase(): Promise<DB> {
  let db: DB;
  if (process.env.DATABASE_URL) {
    const pool = new Pool(postgresPoolConfig(process.env.DATABASE_URL));
    db = {
      query: async (s, a) => (await pool.query(s, a)).rows,
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const result = await fn(async (s, a) => (await c.query(s, a)).rows);
          await c.query('COMMIT');
          return result;
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        } finally {
          c.release();
        }
      },
      close: () => pool.end(),
    };
  } else {
    mkdirSync(process.env.DATA_DIR || '.data', { recursive: true });
    const sqlite = new DatabaseSync(`${process.env.DATA_DIR || '.data'}/studio.sqlite`);
    sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    let chain = Promise.resolve();
    const serial = <T>(fn: () => Promise<T>): Promise<T> => {
      const result = chain.then(fn);
      chain = result.then(
        () => {},
        () => {},
      );
      return result;
    };
    const raw: Query = async (s, a = []) => {
      const statement = sqlite.prepare(s.replace(/\$\d+/g, '?'));
      return statement.all(...(a as any[]));
    };
    db = {
      query: (s, a) => serial(() => raw(s, a)),
      transaction: (fn) =>
        serial(async () => {
          sqlite.exec('BEGIN IMMEDIATE');
          try {
            const result = await fn(raw);
            sqlite.exec('COMMIT');
            return result;
          } catch (e) {
            sqlite.exec('ROLLBACK');
            throw e;
          }
        }),
      close: async () => {
        await chain;
        sqlite.close();
      },
    };
  }
  await db.transaction(async (q) => {
    if (process.env.DATABASE_URL) await q('SELECT pg_advisory_xact_lock(64007878)');
    await q(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
    );
    for (const migration of migrations) {
      const [existing] = await q('SELECT version FROM schema_migrations WHERE version=$1', [
        migration.version,
      ]);
      if (existing) continue;
      for (const statement of migration.statements) await q(statement);
      // Supabase exposes public-schema tables through PostgREST. Deny direct client
      // access; the table-owning server connection retains access through this API.
      if (process.env.DATABASE_URL && 'postgresStatements' in migration)
        for (const statement of migration.postgresStatements || []) await q(statement);
      if (migration.version === 2) {
        const published = await q(
          'SELECT id,published_game FROM projects WHERE published_game IS NOT NULL',
        );
        for (const p of published)
          for (const url of new Set<string>(
            p.published_game.match(/\/api\/assets\/[a-f0-9-]{36}/g) || [],
          ))
            await q(
              'INSERT INTO published_assets(project_id,asset_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
              [p.id, url.split('/').at(-1)],
            );
      }
      await q('INSERT INTO schema_migrations(version,applied_at) VALUES ($1,$2)', [
        migration.version,
        new Date().toISOString(),
      ]);
    }
  });
  return db;
}
