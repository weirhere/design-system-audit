import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // During next build, DATABASE_URL may not be set.
    // Return a drizzle instance with a placeholder — it will fail at query time,
    // but this avoids crashing during static page collection.
    const noop = postgres('postgres://localhost:5432/noop', { prepare: false });
    return drizzle(noop, { schema });
  }

  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
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
