/**
 * Database client.
 *
 * - Web app (serverless on Vercel) uses @neondatabase/serverless HTTP driver
 *   when DATABASE_URL points at *.neon.tech (free tier, no connection pool
 *   exhaustion on cold starts).
 * - Worker (long-lived Node process on Railway) and local dev use the
 *   regular `pg` driver with a small pool.
 *
 * Both expose the same `db` Drizzle instance so application code is identical.
 *
 * The Drizzle instance is constructed eagerly at module load so that the
 * Auth.js Drizzle adapter's `instanceof` type-detection works correctly.
 * If DATABASE_URL is missing, we still instantiate a node-postgres pool
 * pointing at a default placeholder — actual queries will fail at runtime
 * with a clear error, but `next build`'s static-data collection succeeds.
 */
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgres://placeholder:placeholder@127.0.0.1:5432/placeholder";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL not set — using a non-functional placeholder. Queries will fail at runtime."
  );
}

const isNeon = /neon\.tech/.test(url);
const isProduction = process.env.NODE_ENV === "production";
// Use Neon HTTP driver only when:
//   - URL is a Neon URL
//   - We're not running inside the worker (which has long-lived connections
//     and benefits from pooling instead of HTTP per query).
const useNeonHttp = isNeon && process.env.WORKER_PROCESS !== "1";

let dbInstance: NodePgDatabase<typeof schema>;

if (useNeonHttp) {
  const client = neon(url);
  // The Neon HTTP driver's drizzle output is structurally compatible
  // with NodePgDatabase for the query patterns we use.
  dbInstance = drizzleNeon(client, { schema, logger: !isProduction }) as unknown as NodePgDatabase<typeof schema>;
} else {
  const pool = new Pool({
    connectionString: url,
    max: process.env.WORKER_PROCESS === "1" ? 5 : 3,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  });
  dbInstance = drizzleNode(pool, { schema, logger: !isProduction });
}

export const db = dbInstance;
export { schema };
export * from "./schema";
