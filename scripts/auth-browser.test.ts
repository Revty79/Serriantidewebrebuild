import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import pg from "pg";

const databaseUrl = new URL(process.env.DATABASE_URL!);
assert.equal(databaseUrl.hostname, "127.0.0.1"); assert.equal(databaseUrl.port, "55439");
assert.equal(databaseUrl.pathname, "/serrian_tide_rebuild_dev"); assert.equal(databaseUrl.username, "rebuild_local");
assert.ok(existsSync(".next/BUILD_ID"), "Run npm run build before the production browser checks.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prefix = `flow_${randomBytes(5).toString("hex")}`;
const player = { username: `${prefix}_player`, email: `${prefix}_player@example.invalid`, password: randomBytes(18).toString("base64url") };
const director = { username: `${prefix}_god`, email: `${prefix}_god@example.invalid`, password: randomBytes(18).toString("base64url") };
const escalator = { username: `${prefix}_extra`, email: `${prefix}_extra@example.invalid`, password: randomBytes(18).toString("base64url") };
const artifacts = path.resolve("artifacts/auth");
await mkdir(artifacts, { recursive: true });
const listener = createServer(); await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
const address = listener.address(); assert.ok(address && typeof address === "object");
const port = address.port; await new Promise<void>((resolve) => listener.close(() => resolve()));
const base = `http://localhost:${port}`;
let server: ChildProcess | undefined, browser: Browser | undefined, activePage: Page | undefined, log = "";
const checks: string[] = [], errors: string[] = [];
async function screen(page: Page, name: string, width = 390) {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: no horizontal overflow`);
  await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage: true });
}
async function login(page: Page, account: typeof player, byEmail = false) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Username or Email", { exact: true }).fill(byEmail ? account.email : account.username);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Enter", exact: true }).click();
  await page.waitForURL(`${base}/access`);
  await page.getByRole("heading", { name: "Choose Your Path", exact: true }).waitFor();
}
async function cards(page: Page) {
  return page.locator("h3").allTextContents();
}
try {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(), env: { ...process.env, BETTER_AUTH_URL: base, NEXT_TELEMETRY_DISABLED: "1" }, stdio: "pipe", windowsHide: true,
  });
  server.stdout?.on("data", (data) => { log += data.toString(); }); server.stderr?.on("data", (data) => { log += data.toString(); });
  const deadline = Date.now() + 45_000;
  while (true) {
    if (server.exitCode !== null) throw new Error("Production test server exited before startup.");
    try { if ((await fetch(`${base}/login`)).ok) break; } catch { /* Wait for this server. */ }
    assert.ok(Date.now() < deadline, "Production server startup timed out.");
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(15_000);
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/access", "/admin", "/admin/users", "/admin/users/missing", "/admin/content", "/admin/appearance", "/heavens", "/realms", "/chat"]) {
    await page.goto(`${base}${route}`); await page.waitForURL(`${base}/login`);
  }
  checks.push("Every protected destination redirects anonymous requests to login.");
  await page.goto(base); await screen(page, "landing-desktop", 1365); await screen(page, "landing-phone");
  await page.getByRole("link", { name: "Enter Your Imagination", exact: true }).click();
  await page.waitForURL(`${base}/login`); await screen(page, "login-phone");
  await page.getByLabel("Username or Email", { exact: true }).fill(player.username);
  await page.getByLabel("Password", { exact: true }).fill("Wrong-password-for-test");
  await page.getByRole("button", { name: "Enter", exact: true }).click(); await page.getByRole("alert").waitFor();
  assert.match(page.url(), /\/login$/);
  checks.push("Landing links to login; invalid credentials show a readable error without opening access.");
  await page.getByRole("link", { name: "Create Account", exact: true }).click();
  await page.getByLabel("Display Name", { exact: true }).fill("Flow Test Player");
  await page.getByLabel("Username", { exact: true }).fill(player.username);
  await page.getByLabel("Email", { exact: true }).fill(player.email);
  await page.getByLabel("Password", { exact: true }).fill(player.password);
  await page.getByLabel("Confirm Password", { exact: true }).fill("Mismatch-password");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Passwords do not match." }).waitFor();
  assert.equal((await pool.query('select id from "user" where username=$1', [player.username])).rowCount, 0);
  await page.getByLabel("Confirm Password", { exact: true }).fill(player.password);
  await screen(page, "register-phone");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Account created successfully" }).waitFor();
  const userId = (await pool.query('select id from "user" where username=$1', [player.username])).rows[0].id;
  assert.deepEqual((await pool.query("select role from user_role where user_id=$1", [userId])).rows.map(({ role }) => role), ["player"]);
  assert.notEqual((await pool.query("select password from account where user_id=$1", [userId])).rows[0].password, player.password);
  await page.goto(`${base}/access`); await page.waitForURL(`${base}/login`);
  checks.push("Registration validates confirmation, stores a hashed password, grants Player only and requires explicit login.");
  await login(page, player);
  assert.deepEqual(await cards(page), ["THE REALMS", "THE CROSSROADS"]);
  await screen(page, "player-access-phone"); await screen(page, "player-access-desktop", 1365);
  await page.reload(); assert.deepEqual(await cards(page), ["THE REALMS", "THE CROSSROADS"]);
  for (const route of ["/admin", "/heavens"]) {
    await page.goto(`${base}${route}`); await page.waitForURL(`${base}/access?denied=1`);
    await page.getByRole("alert").filter({ hasText: "does not have access" }).waitFor();
  }
  for (const [route, title] of [["/realms", "The Realms"], ["/chat", "The Crossroads"]]) {
    await page.goto(`${base}${route}`); await page.getByRole("heading", { name: title, exact: true }).waitFor();
  }
  checks.push("Username login and refresh retain the Player session; direct Admin/G.O.D. URLs are denied server-side while Player/Crossroads destinations work.");
  const staleCookies = await context.cookies();
  assert.ok(staleCookies.some(({ name }) => name.startsWith("serrian-rebuild")));
  assert.equal(staleCookies.some(({ name }) => name.startsWith("better-auth")), false);
  await page.getByRole("button", { name: "Sign out", exact: true }).click(); await page.waitForURL(`${base}/login`);
  const stale = await browser.newContext(); await stale.addCookies(staleCookies);
  const stalePage = await stale.newPage(); await stalePage.goto(`${base}/access`); await stalePage.waitForURL(`${base}/login`); await stale.close();
  await login(page, player, true);
  checks.push("Logout revokes the old session on the server; email login works; rebuild cookies have an independent namespace.");
  for (const account of [director, escalator]) {
    const response = await context.request.post(`${base}/api/auth/sign-up/email`, { headers: { Origin: base }, data: { ...account, name: "Flow Test Account", role: "admin", roles: ["admin"] } });
    assert.equal(response.ok(), true);
  }
  const extraId = (await pool.query('select id from "user" where username=$1', [escalator.username])).rows[0].id;
  assert.deepEqual((await pool.query("select role from user_role where user_id=$1", [extraId])).rows.map(({ role }) => role), ["player"]);
  checks.push("Submitting administrator role fields during public registration cannot elevate access.");
  const godId = (await pool.query('select id from "user" where username=$1', [director.username])).rows[0].id;
  await pool.query("delete from user_role where user_id=$1", [godId]);
  await pool.query("insert into user_role (user_id,role) values ($1,'god')", [godId]);
  const other = await browser.newContext(); const godPage = await other.newPage(); activePage = godPage;
  godPage.on("pageerror", (error) => errors.push(error.message));
  await login(godPage, director); assert.deepEqual(await cards(godPage), ["THE HEAVENS", "THE CROSSROADS"]);
  await godPage.goto(`${base}/heavens`); await godPage.getByRole("heading", { name: "The Heavens", exact: true }).waitFor();
  await godPage.goto(`${base}/realms`); await godPage.waitForURL(`${base}/access?denied=1`);
  await pool.query("insert into user_role (user_id,role) values ($1,'admin'),($1,'player')", [godId]);
  await godPage.goto(`${base}/access`); assert.deepEqual(await cards(godPage), ["ADMIN", "THE HEAVENS", "THE REALMS", "THE CROSSROADS"]);
  await screen(godPage, "admin-access-desktop", 1365); await screen(godPage, "admin-access-phone");
  await godPage.goto(`${base}/admin`); await godPage.getByRole("heading", { name: "Admin Dashboard", exact: true }).waitFor();
  await pool.query("delete from user_role where user_id=$1 and role='god'", [godId]);
  await godPage.goto(`${base}/heavens`); await godPage.waitForURL(`${base}/access?denied=1`);
  checks.push("G.O.D., Player and Admin remain independent roles; added/revoked roles take effect on the next server request without signing out.");
  await pool.query("delete from user_role where user_id=$1", [godId]);
  await godPage.goto(`${base}/access`); await godPage.getByRole("heading", { name: "No Access Assigned", exact: true }).waitFor();
  await godPage.goto(`${base}/chat`); await godPage.waitForURL(`${base}/access?denied=1`);
  checks.push("An authenticated account without roles sees No Access Assigned and cannot enter the shared destination.");
  assert.deepEqual(errors, []);
  await writeFile(path.join(artifacts, "results.json"), JSON.stringify({ passed: true, productionBuild: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (error) {
  if (activePage) await activePage.screenshot({ path: path.join(artifacts, "failure.png"), fullPage: true }).catch(() => undefined);
  await writeFile(path.join(artifacts, "results.json"), JSON.stringify({ passed: false, checks, errors, failure: String(error) }, null, 2));
  throw error;
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) { server.kill(); await new Promise<void>((resolve) => { const timer = setTimeout(resolve, 3000); server!.once("exit", () => { clearTimeout(timer); resolve(); }); }); }
  await pool.query('delete from "user" where username = any($1::text[]) and email like $2', [[player.username, director.username, escalator.username], "%@example.invalid"]);
  await pool.end(); await writeFile(path.join(artifacts, "server.log"), log);
}
