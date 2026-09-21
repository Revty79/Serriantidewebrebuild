import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { chromium, type Browser, type Page, type BrowserContext } from "playwright-core";
import pg from "pg";

const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname,"127.0.0.1"); assert.equal(url.port,"55439");
assert.equal(url.pathname,"/serrian_tide_rebuild_dev"); assert.equal(url.username,"rebuild_local");
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL});
const prefix = `adm_${randomBytes(4).toString("hex")}`;
const accounts = ["owner","subject"].map((label)=>({username:`${prefix}_${label}`,email:`${prefix}_${label}@example.invalid`,name:`Admin browser ${label}`,password:randomBytes(18).toString("base64url")}));
const [owner,subject] = accounts;
const userIds: string[] = [];
const savedAppearance = (await pool.query("select * from site_appearance_setting where key='site'")).rows[0];
const artifacts=path.resolve("artifacts/admin"); await mkdir(artifacts,{recursive:true});
const listener=createServer(); await new Promise<void>((resolve)=>listener.listen(0,"127.0.0.1",resolve));
const address=listener.address(); assert.ok(address && typeof address === "object");
const port=address.port; await new Promise<void>((resolve)=>listener.close(()=>resolve()));
const base=`http://localhost:${port}`;
const checks:string[]=[], errors:string[]=[];
let browser:Browser|undefined, server:ChildProcess|undefined, activePage:Page|undefined, log="", fixtureCreated=false;
const fixture=`${prefix}_retained`;
type CapturedAction = { url:string; body:string; action:string; contentType:string };
let lastAction:CapturedAction|undefined;
async function login(page:Page,account:typeof owner) {
  await page.goto(`${base}/login`); await page.getByLabel("Username or Email",{exact:true}).fill(account.username);
  await page.getByLabel("Password",{exact:true}).fill(account.password); await page.getByRole("button",{name:"Enter",exact:true}).click();
  await page.waitForURL(`${base}/access`);
}
async function screenshot(page:Page,name:string,width=390) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(async()=>{ window.scrollTo(0,0); await document.fonts.ready; await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))); });
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,`${name}: no horizontal overflow`);
  await page.screenshot({path:path.join(artifacts,`${name}.png`),fullPage:true});
}
async function replay(context:BrowserContext,action:CapturedAction) {
  return context.request.post(action.url,{headers:{Origin:base,"next-action":action.action,"content-type":action.contentType},data:action.body});
}
try {
  server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",String(port)],{
    env:{...process.env,BETTER_AUTH_URL:base,NEXT_TELEMETRY_DISABLED:"1",SERRIAN_TIDE_ENABLE_PERMANENT_DELETION:"true"},windowsHide:true,stdio:"pipe",
  });
  server.stdout?.on("data",data=>{log+=data.toString();});server.stderr?.on("data",data=>{log+=data.toString();});
  const deadline=Date.now()+45_000;
  while(true) {
    if(server.exitCode!==null) throw new Error("Test server exited before startup.");
    try {if((await fetch(`${base}/login`)).ok)break;}catch{}
    assert.ok(Date.now()<deadline,"Production test server timed out"); await new Promise(resolve=>setTimeout(resolve,250));
  }
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH??"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
  const adminContext=await browser.newContext({viewport:{width:1440,height:1000}});
  const playerContext=await browser.newContext(); const anonymous=await browser.newContext();
  for(const account of accounts) {
    const response=await anonymous.request.post(`${base}/api/auth/sign-up/email`,{headers:{Origin:base},data:account});
    assert.equal(response.ok(),true); userIds.push((await pool.query('select id from "user" where username=$1',[account.username])).rows[0].id);
  }
  const [ownerId,subjectId]=userIds;
  await pool.query("insert into user_role (user_id,role) values ($1,'admin')",[ownerId]);
  const page=await adminContext.newPage();activePage=page;page.setDefaultTimeout(15_000);
  page.on("pageerror",error=>errors.push(error.message));
  page.on("request",request=>{const headers=request.headers();if(headers["next-action"])lastAction={url:request.url(),body:request.postData()??"",action:headers["next-action"],contentType:headers["content-type"]};});
  const playerPage=await playerContext.newPage();playerPage.setDefaultTimeout(15_000);
  await login(page,owner);await login(playerPage,subject);
  for(const route of ["/admin","/admin/users",`/admin/users/${ownerId}`,"/admin/appearance","/admin/content"]) {
    await playerPage.goto(`${base}${route}`);await playerPage.waitForURL(`${base}/access?denied=1`);
  }
  checks.push("Every admin route denies a signed-in Player, including account details and appearance.");
  await page.goto(`${base}/admin`);await page.getByRole("heading",{name:"Admin Dashboard",exact:true}).waitFor();
  await screenshot(page,"dashboard-desktop",1440);await screenshot(page,"dashboard-phone");
  await page.getByText("Navigate",{exact:true}).click();
  await page.getByRole("navigation",{name:"Administration mobile navigation"}).getByRole("link",{name:"Users & Roles",exact:true}).click();
  await page.waitForURL(`${base}/admin/users`);await page.getByRole("heading",{name:"User Management",exact:true}).waitFor();
  await screenshot(page,"users-phone");await screenshot(page,"users-desktop",1440);
  const row=page.locator("article").filter({has:page.getByRole("heading",{name:subject.name,exact:true})});
  await row.getByRole("button",{name:"Grant G.O.D. access",exact:true}).click();await row.getByRole("status").filter({hasText:"G.O.D. access granted"}).waitFor();
  await playerPage.goto(`${base}/access`);assert.ok((await playerPage.locator("h3").allTextContents()).includes("THE HEAVENS"));
  await row.getByRole("button",{name:"Remove G.O.D. access",exact:true}).click();await row.getByRole("status").filter({hasText:"G.O.D. access removed"}).waitFor();
  await playerPage.goto(`${base}/heavens`);await playerPage.waitForURL(`${base}/access?denied=1`);
  await row.getByRole("button",{name:"Grant ADMIN access",exact:true}).click();await row.getByRole("status").filter({hasText:"Admin access granted"}).waitFor();
  assert.ok(lastAction);const roleAction={...lastAction};
  await row.getByRole("button",{name:"Remove ADMIN access",exact:true}).click();await row.getByRole("status").filter({hasText:"Admin access removed"}).waitFor();
  assert.match(await (await replay(playerContext,roleAction)).text(),/Administrator access is required/);
  assert.match(await (await replay(anonymous,roleAction)).text(),/must be signed in/);
  assert.equal((await pool.query("select role from user_role where user_id=$1 and role='admin'",[subjectId])).rowCount,0);
  const ownRow=page.locator("article").filter({has:page.getByRole("heading",{name:owner.name,exact:true})});
  assert.equal(await ownRow.getByRole("button",{name:"Remove ADMIN access",exact:true}).isDisabled(),true);
  checks.push("Real role controls grant/revoke access without relogin; self-demotion is disabled and forged Player/anonymous Server Action replays cannot grant Admin.");
  await pool.query("delete from user_role where user_id=$1 and role='admin'",[ownerId]);
  assert.match(await (await replay(adminContext,roleAction)).text(),/Administrator access is required/);
  await pool.query("insert into user_role (user_id,role) values ($1,'admin')",[ownerId]);
  checks.push("An administrator's already-open page cannot mutate roles after that administrator is demoted.");
  await row.getByRole("link",{name:"View Account",exact:true}).click();await page.waitForURL(`${base}/admin/users/${subjectId}`);
  await page.getByRole("heading",{name:subject.name,exact:true}).waitFor();
  assert.ok((await page.getByText("Not available yet",{exact:true}).count())>=5);
  await screenshot(page,"account-desktop",1440);await screenshot(page,"account-phone");
  await page.goto(`${base}/admin/users/does-not-exist`);await page.getByText("This page could not be found.",{exact:true}).waitFor();
  await page.goto(`${base}/admin/content`);await page.getByRole("heading",{name:"Content Overview",exact:true}).waitFor();
  assert.ok((await page.getByText("Not available yet",{exact:true}).count())>=9);
  await screenshot(page,"content-phone");await screenshot(page,"content-desktop",1440);
  checks.push("Account details/404 and content summaries work and clearly mark untransferred systems; mobile navigation and layouts fit.");
  await page.goto(`${base}/admin/appearance`);await page.getByRole("heading",{name:"Site Appearance",exact:true}).waitFor();
  const rootColor=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--st-primary").trim());
  await page.getByRole("button",{name:"Classic",exact:true}).click();
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--st-primary").trim()),rootColor);
  assert.equal(await page.locator("[data-appearance-preview]").evaluate(element=>getComputedStyle(element).getPropertyValue("--st-primary").trim()),"#8B5CF6");
  await page.getByRole("button",{name:"Cancel changes",exact:true}).click();
  await page.getByLabel("Main text hex value",{exact:true}).fill("#04030C");await page.getByRole("alert").filter({hasText:"contrast"}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Save appearance",exact:true}).isDisabled(),true);
  await page.getByRole("button",{name:"Cancel changes",exact:true}).click();
  await page.getByRole("button",{name:"Classic",exact:true}).click();
  await screenshot(page,"appearance-desktop",1440);await screenshot(page,"appearance-phone");
  await page.locator("[data-appearance-preview]").scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(artifacts,"appearance-preview-phone.png")});
  await page.getByRole("button",{name:"Save appearance",exact:true}).click();await page.getByRole("status").filter({hasText:"Site appearance saved"}).waitFor();
  assert.ok(lastAction);const appearanceAction={...lastAction};
  assert.equal((await pool.query("select preset_id from site_appearance_setting where key='site'")).rows[0].preset_id,"classic");
  const publicPage=await anonymous.newPage();await publicPage.goto(`${base}/login`);
  assert.equal(await publicPage.locator("html").getAttribute("data-appearance-preset"),"classic");
  assert.match(await (await replay(playerContext,appearanceAction)).text(),/admin access is required/);
  await page.reload();assert.equal(await page.getByRole("button",{name:"Classic",exact:true}).getAttribute("aria-pressed"),"true");
  await page.getByLabel("Primary accent hex value",{exact:true}).fill("#8866EE");
  await page.getByRole("button",{name:"Restore preset defaults",exact:true}).click();
  assert.equal(await page.getByLabel("Primary accent hex value",{exact:true}).inputValue(),"#8B5CF6");
  await page.getByRole("button",{name:"Serrian Tide",exact:true}).click();
  await page.getByRole("button",{name:"Save appearance",exact:true}).click();await page.getByRole("status").filter({hasText:"Site appearance saved"}).waitFor();
  checks.push("Appearance preview is isolated, cancel/defaults work, unreadable colors are rejected, saves persist to public pages, and Player action replay is denied.");
  await page.goto(`${base}/admin/users/${subjectId}`);
  await page.getByRole("button",{name:"Delete account",exact:true}).click();
  const dialog=page.getByRole("dialog");await dialog.waitFor();
  assert.equal(await dialog.getByRole("button",{name:"Permanently delete account",exact:true}).isDisabled(),true);
  await dialog.getByRole("button",{name:"Cancel",exact:true}).click();assert.equal(await dialog.isVisible(),false);
  await page.getByRole("button",{name:"Delete account",exact:true}).click();
  await dialog.getByLabel("Reason for deletion").fill("Fresh synthetic account removed by browser validation");
  await dialog.locator('input[name="confirmationText"]').fill(`DELETE ${subject.email}`);
  await pool.query(`create table "${fixture}" (id integer,user_id text references "user"(id) on delete cascade)`);fixtureCreated=true;
  await pool.query(`insert into "${fixture}" values (1,$1)`,[subjectId]);
  await dialog.getByRole("button",{name:"Permanently delete account",exact:true}).click();
  await dialog.getByRole("alert").filter({hasText:"retained content or history"}).waitFor();
  assert.equal(await dialog.locator('input[name="confirmationText"]').inputValue(),`DELETE ${subject.email}`);
  await screenshot(page,"delete-rejection-phone");
  await pool.query(`drop table "${fixture}"`);fixtureCreated=false;
  await dialog.getByRole("button",{name:"Permanently delete account",exact:true}).click();await page.waitForURL(`${base}/admin/users?deleted=1`);
  await page.getByRole("status").filter({hasText:"permanently deleted"}).waitFor();
  assert.equal((await pool.query('select id from "user" where id=$1',[subjectId])).rowCount,0);
  assert.equal((await pool.query('select id from lifecycle_audit_event where target_id=$1 and actor_user_id=$2',[subjectId,ownerId])).rowCount,1);
  await playerPage.goto(`${base}/access`);await playerPage.waitForURL(`${base}/login`);
  checks.push("Deletion dialog cancels safely, rechecks new dependencies, preserves input after refusal, deletes only after resolution, audits the deletion and invalidates the deleted user's session.");
  await screenshot(page,"users-after-deletion-desktop",1440);
  await page.getByRole("button",{name:"Log Out",exact:true}).filter({visible:true}).click();await page.waitForURL(`${base}/login`);
  assert.deepEqual(errors,[]);
  await writeFile(path.join(artifacts,"results.json"),JSON.stringify({passed:true,productionBuild:true,checks,errors},null,2));
  console.log(JSON.stringify({passed:true,checks,errors},null,2));
} catch(error) {
  if(activePage)await activePage.screenshot({path:path.join(artifacts,"failure.png"),fullPage:true}).catch(()=>undefined);
  await writeFile(path.join(artifacts,"results.json"),JSON.stringify({passed:false,checks,errors,failure:String(error)},null,2));throw error;
} finally {
  if(browser)await browser.close();if(server&&server.exitCode===null)server.kill();
  if(fixtureCreated)await pool.query(`drop table "${fixture}"`);
  if(savedAppearance)await pool.query(`update site_appearance_setting set preset_id=$1,page_background=$2,surface_background=$3,primary_accent=$4,secondary_accent=$5,main_text=$6,muted_text=$7,updated_by_user_id=$8,created_at=$9,updated_at=$10 where key='site'`,[savedAppearance.preset_id,savedAppearance.page_background,savedAppearance.surface_background,savedAppearance.primary_accent,savedAppearance.secondary_accent,savedAppearance.main_text,savedAppearance.muted_text,savedAppearance.updated_by_user_id,savedAppearance.created_at,savedAppearance.updated_at]);
  else await pool.query("delete from site_appearance_setting where key='site' and updated_by_user_id=any($1::text[])",[userIds]);
  await pool.query('delete from lifecycle_audit_event where actor_user_id=any($1::text[])',[userIds]);
  await pool.query('delete from "user" where id=any($1::text[])',[userIds]);
  await pool.end();await writeFile(path.join(artifacts,"server.log"),log);
}
