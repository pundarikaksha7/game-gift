import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  defaultDatabaseCaPath,
  postgresPoolConfig,
  postgresSslConfig,
} from '../server/postgres-ssl';

test('remote Postgres verifies TLS with certs/prod-ca-2021.crt even when sslmode=require', () => {
  const ca = readFileSync(defaultDatabaseCaPath, 'utf8');
  const ssl = postgresSslConfig(
    'postgresql://user:pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require',
    {},
  );
  assert.equal(ssl !== false && ssl.rejectUnauthorized, true);
  assert.equal(ssl !== false && ssl.ca, ca);
  const pool = postgresPoolConfig(
    'postgresql://user:pass@db.example.com:5432/postgres?sslmode=require&sslrootcert=/tmp/ignored.crt',
    { DATABASE_SSL_CA: defaultDatabaseCaPath },
  );
  assert.equal(new URL(pool.connectionString!).searchParams.has('sslmode'), false);
  assert.deepEqual(pool.ssl, { rejectUnauthorized: true, ca });
});

test('loopback Postgres stays plaintext unless sslmode requests verification', () => {
  assert.equal(postgresSslConfig('postgresql://game-gift:x@127.0.0.1:5432/game-gift', {}), false);
  assert.equal(
    postgresSslConfig('postgresql://game-gift:x@localhost:5432/game-gift?sslmode=disable', {}),
    false,
  );
});

test('TLS CA loading survives a stale Render secret-file path and supports inline PEM', () => {
  const bundled = readFileSync(defaultDatabaseCaPath, 'utf8');
  assert.deepEqual(
    postgresSslConfig('postgresql://user:pass@db.example.com/postgres', {
      DATABASE_SSL_CA: '/etc/secrets/missing-prod-ca.crt',
    }),
    { rejectUnauthorized: true, ca: bundled },
  );
  assert.deepEqual(
    postgresSslConfig('postgresql://user:pass@db.example.com/postgres', {
      DATABASE_SSL_CA_PEM: 'line-one\\nline-two',
    }),
    { rejectUnauthorized: true, ca: 'line-one\nline-two' },
  );
});
