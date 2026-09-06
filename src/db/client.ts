import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type PostgresDbClient = PostgresJsDatabase<
  typeof schema,
  typeof schema.relations
>;

const createDb = (): PostgresDbClient => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("ENV var DATABASE_URL is not set!");
  }

  const client = postgres(connectionString, {
    prepare: false,
  });

  return drizzle({
    client,
    schema,
    relations: schema.relations,
  });
};

declare global {
  var database: PostgresDbClient | undefined;
}

export const getDb = (reuse = false): PostgresDbClient => {
  if (!reuse) {
    return createDb();
  }

  if (!globalThis.database) {
    globalThis.database = createDb();
  }

  return globalThis.database;
};
