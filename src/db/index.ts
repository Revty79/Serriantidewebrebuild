import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured. Run npm run local:setup first.");
const globalDatabase = globalThis as unknown as { serrianRebuildPool?: Pool };
export const pool = globalDatabase.serrianRebuildPool ?? new Pool({ connectionString, max: 5 });
if (process.env.NODE_ENV !== "production") globalDatabase.serrianRebuildPool = pool;
export const db = drizzle(pool);
