import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

export type Database = ReturnType<typeof createDb>;

/**
 * Create a Drizzle client. Pass a connection string (defaults to DATABASE_URL).
 * Reuse a single instance per process.
 */
export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}
