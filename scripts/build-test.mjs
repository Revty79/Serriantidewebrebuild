import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";
const environment = parse(readFileSync(".env.test.local"));
const url = new URL(environment.DATABASE_URL);
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55439");
assert.equal(url.pathname, "/serrian_tide_rebuild_dev"); assert.equal(url.username, "rebuild_local");
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  env: { ...process.env, ...environment, NEXT_TELEMETRY_DISABLED: "1" }, windowsHide: true, stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
