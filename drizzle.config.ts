import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit reads DATABASE_URL from the environment (and .env automatically).
 * Falling back to the local sandbox database keeps `drizzle-kit push/generate`
 * working without extra flags during development.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
