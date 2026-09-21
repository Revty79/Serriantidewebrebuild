import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parse } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const local = path.join(root, ".local"), data = path.join(local, "postgres");
assert.equal(path.dirname(data), local);
const configFile = path.join(local, "database.json"), envFile = path.join(root, ".env.test.local");
const database = "serrian_tide_rebuild_dev", username = "rebuild_local";
const command = process.argv[2] ?? "status";
assert.ok(["setup", "start", "stop", "status"].includes(command));
await mkdir(local, { recursive: true });
let config;
if (existsSync(configFile)) config = JSON.parse(await readFile(configFile, "utf8"));
else {
  assert.equal(command, "setup", "Run npm run db:setup first.");
  assert.equal(existsSync(envFile), false, "Existing .env.test.local is preserved. Review it before initializing a new local cluster.");
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once("error", reject); probe.listen(55439, "127.0.0.1", resolve); });
  await new Promise((resolve) => probe.close(resolve));
  config = { database, username, port: 55439, password: randomBytes(24).toString("base64url"), bin: process.env.SERRIAN_POSTGRES_BIN ?? "C:/Program Files/PostgreSQL/18/bin" };
  await writeFile(configFile, JSON.stringify(config, null, 2), { mode: 0o600 });
}
assert.equal(config.database, database); assert.equal(config.username, username);
assert.equal(config.port, 55439); assert.equal(typeof config.password, "string");
const exe = (name) => path.join(config.bin, name + (process.platform === "win32" ? ".exe" : ""));
const run = (name, args) => execFileSync(exe(name), args, { windowsHide: true, stdio: name === "pg_ctl" ? "ignore" : "pipe" });
const running = () => existsSync(path.join(data, "PG_VERSION")) && spawnSync(exe("pg_ctl"), ["-D", data, "status"], { windowsHide: true, stdio: "ignore" }).status === 0;
if (command === "stop") {
  if (running()) run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
  console.log("The rebuild database is stopped; all records are retained.");
} else if (command === "status") {
  console.log(`Rebuild PostgreSQL: ${running() ? "running" : "stopped"}; 127.0.0.1:${config.port}/${database}`);
} else {
  if (!existsSync(path.join(data, "PG_VERSION"))) {
    assert.equal(command, "setup", "Run npm run db:setup first.");
    const passwordFile = path.join(local, "init-password.txt");
    await writeFile(passwordFile, config.password, { mode: 0o600 });
    try { run("initdb", ["--encoding=UTF8", "--no-locale", "--auth=scram-sha-256", `--username=${username}`, `--pwfile=${passwordFile}`, "-D", data]); }
    finally { await unlink(passwordFile); }
  }
  if (!running()) run("pg_ctl", ["-D", data, "-l", path.join(local, "postgres.log"), "-o", `-p ${config.port} -h 127.0.0.1`, "-w", "start"]);
  const connection = { host: "127.0.0.1", port: config.port, user: username, password: config.password };
  const client = new pg.Client({ ...connection, database: "postgres" });
  await client.connect();
  try {
    const found = await client.query("select 1 from pg_database where datname=$1", [database]);
    if (!found.rowCount) await client.query('create database "serrian_tide_rebuild_dev"');
  } finally { await client.end(); }
  const connectionString = `postgresql://${username}:${config.password}@127.0.0.1:${config.port}/${database}`;
  if (existsSync(envFile)) {
    const existing = parse(await readFile(envFile));
    assert.equal(existing.DATABASE_URL, connectionString, "The existing environment points at a different database; it was not overwritten.");
  } else {
    await writeFile(envFile, `DATABASE_URL=${connectionString}
BETTER_AUTH_URL=http://localhost:3010
BETTER_AUTH_SECRET=${randomBytes(48).toString("base64url")}
`, { mode: 0o600 });
  }
  const runtimeEnv = path.join(root, ".env.local");
  if (!existsSync(runtimeEnv)) await writeFile(runtimeEnv, await readFile(envFile), { mode: 0o600 });
  console.log(`Rebuild PostgreSQL ready: 127.0.0.1:${config.port}/${database}. Existing records preserved.`);
}
