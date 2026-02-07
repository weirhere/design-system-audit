import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/data'
  : join(process.cwd(), 'data');

const DB_PATH = join(DB_DIR, 'audit.db');

function createDb() {
  const dir = DB_DIR;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create auth tables (singular names required by @auth/drizzle-adapter)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      emailVerified INTEGER,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS "account" (
      userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      PRIMARY KEY (provider, providerAccountId)
    );

    CREATE TABLE IF NOT EXISTS "session" (
      sessionToken TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "verificationToken" (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires INTEGER NOT NULL,
      PRIMARY KEY (identifier, token)
    );
  `);

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      parent_system_url TEXT,
      product_urls TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      config TEXT NOT NULL,
      user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS crawl_jobs (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      started_at TEXT,
      completed_at TEXT,
      error TEXT,
      page_count INTEGER NOT NULL DEFAULT 0,
      progress REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS crawled_pages (
      id TEXT PRIMARY KEY,
      crawl_job_id TEXT NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      screenshot_path TEXT,
      crawled_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS extracted_tokens (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      crawled_page_id TEXT NOT NULL REFERENCES crawled_pages(id) ON DELETE CASCADE,
      source_product TEXT NOT NULL,
      layer TEXT NOT NULL,
      property TEXT NOT NULL,
      computed_value TEXT NOT NULL,
      raw_value TEXT,
      css_variable TEXT,
      selector TEXT NOT NULL,
      frequency INTEGER NOT NULL DEFAULT 1,
      classification TEXT NOT NULL DEFAULT 'unclassified',
      classification_confidence REAL NOT NULL DEFAULT 0,
      classification_overridden INTEGER NOT NULL DEFAULT 0,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS extracted_components (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      source_product TEXT NOT NULL,
      name TEXT NOT NULL,
      selector TEXT NOT NULL,
      variants TEXT,
      states TEXT,
      token_ids TEXT,
      html_snapshot TEXT,
      frequency INTEGER NOT NULL DEFAULT 1,
      classification TEXT NOT NULL DEFAULT 'unclassified',
      classification_confidence REAL NOT NULL DEFAULT 0,
      classification_overridden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS extracted_patterns (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      source_product TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      component_ids TEXT,
      responsive_behavior TEXT,
      classification TEXT NOT NULL DEFAULT 'unclassified',
      classification_confidence REAL NOT NULL DEFAULT 0,
      classification_overridden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comparison_results (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_property TEXT NOT NULL,
      canonical_value TEXT NOT NULL,
      product_values TEXT NOT NULL,
      divergence_score REAL NOT NULL DEFAULT 0,
      classification TEXT NOT NULL DEFAULT 'unclassified'
    );

    CREATE TABLE IF NOT EXISTS migration_tasks (
      id TEXT PRIMARY KEY,
      audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_ids TEXT NOT NULL,
      source_product TEXT NOT NULL,
      classification TEXT NOT NULL,
      effort_estimate TEXT NOT NULL,
      priority TEXT NOT NULL,
      phase INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo'
    );

    CREATE INDEX IF NOT EXISTS idx_tokens_audit ON extracted_tokens(audit_id);
    CREATE INDEX IF NOT EXISTS idx_tokens_layer ON extracted_tokens(audit_id, layer);
    CREATE INDEX IF NOT EXISTS idx_tokens_product ON extracted_tokens(audit_id, source_product);
    CREATE INDEX IF NOT EXISTS idx_tokens_classification ON extracted_tokens(audit_id, classification);
    CREATE INDEX IF NOT EXISTS idx_crawl_jobs_audit ON crawl_jobs(audit_id);
    CREATE INDEX IF NOT EXISTS idx_crawled_pages_audit ON crawled_pages(audit_id);
    CREATE INDEX IF NOT EXISTS idx_comparison_audit ON comparison_results(audit_id);
    CREATE INDEX IF NOT EXISTS idx_migration_audit ON migration_tasks(audit_id);
  `);

  // Migrate existing DBs: add user_id column to audits if missing
  const columns = sqlite.pragma('table_info(audits)') as { name: string }[];
  const hasUserId = columns.some((col) => col.name === 'user_id');
  if (!hasUserId) {
    sqlite.exec('ALTER TABLE audits ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE');
  }

  return drizzle(sqlite, { schema });
}

// Singleton
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;
