import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type DB = DrizzleD1Database<typeof schema>;
export * as t from "./schema";

/** Use from Worker-side code (Workflows) that receives `env` directly. */
export function createDb(d1: D1Database): DB {
  return drizzle(d1, { schema });
}

/** Use from Next.js server code (pages, actions, route handlers). */
export async function getDb(): Promise<DB> {
  // DB reads are always request-time data: opt out of prerendering before touching the binding.
  const { connection } = await import("next/server");
  await connection();
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return createDb(env.DB);
}
