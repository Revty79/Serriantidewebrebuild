import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { user } from "../src/db/auth-schema";
import { userRole, type SerrianRole } from "../src/db/authorization-schema";
import { auth } from "../src/lib/auth";

const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439");
assert.equal(url.pathname, "/serrian_tide_rebuild_dev"); assert.equal(url.username, "rebuild_local");
type Account = { username: string; email: string; name: string; password: string; roles: SerrianRole[] };
const file = ".local/test-accounts.json";
const accounts: Account[] = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : [
  { username: "rebuild_admin", name: "Rebuild Administrator", roles: ["admin", "god", "player"] },
  { username: "rebuild_god", name: "Rebuild G.O.D.", roles: ["god", "player"] },
  { username: "rebuild_player", name: "Rebuild Player", roles: ["player"] },
].map((account) => ({ ...account, roles: account.roles as SerrianRole[], email: `${account.username}@example.invalid`, password: randomBytes(18).toString("base64url") }));
await writeFile(file, JSON.stringify(accounts, null, 2), { mode: 0o600 });
try {
  for (const account of accounts) {
    assert.ok(["rebuild_admin", "rebuild_god", "rebuild_player"].includes(account.username));
    const [existing] = await db.select().from(user).where(eq(user.username, account.username));
    const accountUser = existing ?? (await auth.api.signUpEmail({ body: { name: account.name, email: account.email, username: account.username, password: account.password } })).user;
    assert.equal(accountUser.email, account.email, "An unrelated account occupies this test username; it was not modified.");
    await db.insert(userRole).values(account.roles.map((role) => ({ userId: accountUser.id, role }))).onConflictDoNothing();
  }
  const lines = ["# Local rebuild test accounts", "", "For this isolated local project only. These accounts do not exist in the reference project or home server.", "", "Open http://localhost:3010/login", "", "| Username | Password | Access |", "| --- | --- | --- |", ...accounts.map((a) => `| ${a.username} | ${a.password} | ${a.roles.join(", ")} |`), "", "You can also register a new account through the UI. Registration grants Player access only."];
  await writeFile("LOCAL-TEST-ACCOUNTS.md", lines.join("\n") + "\n", { mode: 0o600 });
  console.log("Three local test accounts are ready. Credentials are in the git-ignored LOCAL-TEST-ACCOUNTS.md.");
} finally { await pool.end(); }
