import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local before running migrations.");
export default defineConfig({ schema: ["./src/db/auth-schema.ts", "./src/db/authorization-schema.ts", "./src/db/appearance-schema.ts", "./src/db/lifecycle-schema.ts"], out: "./drizzle", dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL } });
