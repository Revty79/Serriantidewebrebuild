import assert from "node:assert/strict";
import { db, pool } from "../src/db";
import { initializeFirstAdministratorInTransaction } from "../src/features/authorization/first-administrator";
try {
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.pathname, "/strebuild_dev", "Bootstrap is restricted to your fresh strebuild_dev database.");
  assert.equal(url.username, "serrian_tide_app", "Use your serrian_tide_app connection.");
  const username = process.argv[2];
  if (!username || process.argv.length !== 3) throw new Error("Usage: npm run admin:bootstrap -- your_new_username");
  const result = await db.transaction((tx) => initializeFirstAdministratorInTransaction(tx, username));
  console.log(result.changed ? `Admin access granted to ${result.username}. Sign in or refresh Choose Your Path.` : `${result.username} already has Admin access.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Administrator bootstrap failed.");
  process.exitCode = 1;
} finally { await pool.end(); }
