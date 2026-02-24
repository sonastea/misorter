import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbClient = PostgresJsDatabase<typeof schema, typeof schema.relations>;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("ENV var DATABASE_URL is not set!");
}

export type PostgresDbClient = PostgresJsDatabase<
  typeof schema,
  typeof schema.relations
>;

// For Cloudflare Workers, create a new connection per request to avoid I/O context issues
export const getDb = (): PostgresDbClient => {
  const client = postgres(connectionString, { prepare: false });
  return drizzle({ client, schema, relations: schema.relations });
};

// Fallback singleton for non-Cloudflare environments (legacy support)
const drizzleClient = drizzle<typeof schema, typeof schema.relations>({
  client: postgres(connectionString, { prepare: false }),
  schema,
  relations: schema.relations,
});

declare global {
  var database: DbClient | undefined;
}

export const db = global.database || drizzleClient;
if (process.env.NODE_ENV !== "production") global.database = db;
