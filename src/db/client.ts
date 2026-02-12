import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("ENV var DATABASE_URL is not set!");
}

// For Cloudflare Workers, create a new connection per request to avoid I/O context issues
export const getDb = () => {
  const client = postgres(connectionString, { prepare: false });
  return drizzle({ client, schema });
};

// Fallback singleton for non-Cloudflare environments (legacy support)
const drizzleClient = drizzle({
  client: postgres(connectionString, { prepare: false }),
  schema,
});

declare global {
  var database: PostgresJsDatabase<typeof schema> | undefined;
}

export const db = global.database || drizzleClient;
if (process.env.NODE_ENV !== "production") global.database = db;
