import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolConfig } from 'pg';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const defaultDatabaseCaPath = path.join(projectRoot, 'certs', 'prod-ca-2021.crt');

export function resolveDatabaseCaPath(env: NodeJS.ProcessEnv = process.env) {
  return env.DATABASE_SSL_CA || env.SUPABASE_CA_CERT_PATH || defaultDatabaseCaPath;
}

/** Loopback Postgres stays plaintext; remote hosts verify with the project CA. */
export function postgresSslConfig(connectionString: string, env: NodeJS.ProcessEnv = process.env) {
  const url = new URL(connectionString);
  const mode = (url.searchParams.get('sslmode') || env.DATABASE_SSLMODE || '').toLowerCase();
  if (mode === 'disable') return false;
  const loopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
  if (loopback && !['require', 'verify-ca', 'verify-full'].includes(mode)) return false;
  const caPath = resolveDatabaseCaPath(env);
  if (!existsSync(caPath))
    throw new Error(
      `Postgres TLS CA certificate not found at ${caPath}. Place prod-ca-2021.crt in certs/ or set DATABASE_SSL_CA.`,
    );
  return { rejectUnauthorized: true as const, ca: readFileSync(caPath, 'utf8') };
}

/** Drop URL sslmode so node-postgres cannot replace the CA with default trust. */
export function postgresPoolConfig(
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslrootcert');
  url.searchParams.delete('sslcert');
  url.searchParams.delete('sslkey');
  return {
    connectionString: url.toString(),
    max: 10,
    ssl: postgresSslConfig(connectionString, env),
  };
}
