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
];
