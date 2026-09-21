import { saasMigration } from './saas-migration';
/** Append migrations; never edit a version already deployed. */
export const migrations = [
  {
    version: 1,
    statements: [
      'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires BIGINT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), game TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, published_id TEXT UNIQUE, published_game TEXT)',
      'CREATE TABLE IF NOT EXISTS revisions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, revision INTEGER NOT NULL, game TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(project_id, revision))',
      'CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), mime TEXT NOT NULL, filename TEXT NOT NULL, size INTEGER NOT NULL)',
      'CREATE INDEX IF NOT EXISTS projects_owner ON projects(owner_id)',
      'CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires)',
    ],
  },
  {
    version: 2,
    statements: [
      'CREATE INDEX IF NOT EXISTS assets_owner ON assets(owner_id)',
      'CREATE TABLE IF NOT EXISTS published_assets (project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, asset_id TEXT NOT NULL REFERENCES assets(id), PRIMARY KEY(project_id,asset_id))',
      'CREATE INDEX IF NOT EXISTS published_assets_asset ON published_assets(asset_id)',
    ],
  },
  {
    version: 3,
    statements: ['CREATE TABLE IF NOT EXISTS deleted_files (filename TEXT PRIMARY KEY)'],
  },
  {
    version: 4,
    statements: [
      'ALTER TABLE users ADD COLUMN google_sub TEXT',
      'CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users(google_sub)',
    ],
  },
  {
    version: 5,
    statements: [],
    postgresStatements: [
      'ALTER TABLE users ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE sessions ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE projects ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE revisions ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE assets ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE published_assets ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE deleted_files ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY',
    ],
  },
  saasMigration,
  {
    version: 7,
    statements: [
      'ALTER TABLE users ADD COLUMN auth_subject TEXT',
      "UPDATE users SET auth_subject=id WHERE auth_provider='supabase'",
      'CREATE UNIQUE INDEX users_auth_subject ON users(auth_subject)',
      'ALTER TABLE deleted_accounts ADD COLUMN auth_subject TEXT',
      'CREATE UNIQUE INDEX deleted_accounts_auth_subject ON deleted_accounts(auth_subject)',
    ],
  },
  {
    version: 8,
    statements: [
      'ALTER TABLE users ADD COLUMN age INTEGER CHECK(age IS NULL OR (age BETWEEN 1 AND 120))',
    ],
  },
];
