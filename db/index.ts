import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// Deliberately do NOT throw here: on PaaS builds the database is commonly not
// reachable at build time. The pool connects lazily, so importing this module
// is always safe — only actual queries require the variable.
if (!databaseUrl) {
  console.warn("[db] DATABASE_URL is not set; queries will fail until it is configured.");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

function createPool(): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    // Some managed postgres providers require SSL; enable with DATABASE_SSL=true
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

export const pool = globalForDb.__arenaNextJsPostgresqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
