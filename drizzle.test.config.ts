import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";
import { parse } from "dotenv";

const { DATABASE_URL } = parse(readFileSync(".env.test.local"));
const url = new URL(DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55439");
assert.equal(url.pathname, "/serrian_tide_rebuild_dev");
assert.equal(url.username, "rebuild_local");

export default defineConfig({
  schema: ["./src/db/auth-schema.ts", "./src/db/authorization-schema.ts", "./src/db/appearance-schema.ts", "./src/db/lifecycle-schema.ts"],
  out: "./drizzle", dialect: "postgresql", dbCredentials: { url: DATABASE_URL },
});
