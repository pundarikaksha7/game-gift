/** Additive migration; users and projects remain the profile/snapshot source of truth. */
const tables = ['products', 'orders', 'entitlements', 'payment_webhook_events', 'reports', 'ai_usage', 'deleted_accounts', 'email_outbox'];
export const saasMigration = {
  version: 6,
  statements: [
    'ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT \'legacy\'',
    'ALTER TABLE projects ADD COLUMN slug TEXT',
    'CREATE UNIQUE INDEX projects_slug ON projects(slug)',
    'ALTER TABLE projects ADD COLUMN published_at TEXT',
    "ALTER TABLE projects ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'active'",
    'ALTER TABLE assets ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL',
    "ALTER TABLE assets ADD COLUMN created_at TEXT NOT NULL DEFAULT ''",
    'CREATE INDEX assets_project ON assets(project_id)',
    'CREATE TABLE products (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, price_amount INTEGER NOT NULL CHECK(price_amount>0), currency TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)',
    "CREATE TABLE orders (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, product_id TEXT NOT NULL REFERENCES products(id), amount INTEGER NOT NULL CHECK(amount>0), currency TEXT NOT NULL, provider TEXT NOT NULL, provider_order_id TEXT UNIQUE, provider_payment_id TEXT UNIQUE, status TEXT NOT NULL CHECK(status IN ('creating','created','paid','failed')), created_at TEXT NOT NULL, paid_at TEXT)",
    'CREATE INDEX orders_owner_project ON orders(user_id,project_id)',
    'CREATE TABLE entitlements (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, type TEXT NOT NULL, source_order_id TEXT NOT NULL REFERENCES orders(id), created_at TEXT NOT NULL, UNIQUE(project_id,type), UNIQUE(source_order_id))',
    'CREATE TABLE payment_webhook_events (id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_event_id TEXT NOT NULL, received_at TEXT NOT NULL, processed_at TEXT, UNIQUE(provider,provider_event_id))',
    'CREATE TABLE reports (id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, reason TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL)',
    'CREATE TABLE ai_usage (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE SET NULL, project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, operation TEXT NOT NULL, model TEXT NOT NULL, input_tokens INTEGER, output_tokens INTEGER, status TEXT NOT NULL, created_at TEXT NOT NULL)',
    'CREATE INDEX ai_usage_user_time ON ai_usage(user_id,created_at)',
    'CREATE TABLE deleted_accounts (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, processed_at TEXT)',
    'CREATE TABLE email_outbox (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, sent_at TEXT, attempts INTEGER NOT NULL DEFAULT 0)',
  ],
  postgresStatements: tables.map((table) => `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`),
};
