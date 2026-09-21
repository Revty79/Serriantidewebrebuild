import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { initializeFirstAdministratorInTransaction } from "../src/features/authorization/first-administrator";
import { userRole } from "../src/db/authorization-schema";
import { eq } from "drizzle-orm";
import { db, pool as applicationPool } from "../src/db";
import { setUserRoleInTransaction } from "../src/features/authorization/user-role-service";
import { previewAdminAccountDeletion, permanentlyDeleteAdminAccount } from "../src/features/lifecycle/admin-account-lifecycle-service";
import { getAccountDeletionProhibitions } from "../src/features/lifecycle/admin-account-lifecycle-policy";
import { isPermanentDeletionEnabled } from "../src/features/lifecycle/policy";
import { saveSiteAppearance } from "../src/features/appearance/appearance-service";
import { APPEARANCE_PRESETS } from "../src/features/appearance/appearance";
import { readAdminContentSource } from "../src/features/authorization/admin-content-source";

const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname,"127.0.0.1"); assert.equal(url.port,"55439");
assert.equal(url.pathname,"/serrian_tide_rebuild_dev"); assert.equal(url.username,"rebuild_local");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prefix = `admincheck_${randomBytes(5).toString("hex")}`;
const ids = Object.fromEntries(["actor","player","target","retained","left","right"].map((key) => [key,`${prefix}_${key}`]));
const checks: string[] = [];
const createdTables: string[] = [];
const savedAppearance = (await pool.query("select * from site_appearance_setting where key='site'")).rows[0];
let appearanceChanged = false;
const email = (id: string) => `${id}@example.invalid`;
async function role(actor: string, target: string, requestedRole: unknown, enabled: unknown) {
  return db.transaction((tx) => setUserRoleInTransaction(tx,actor,{targetUserId:target,requestedRole,enabled}));
}
async function remove(actor: string, target: string, overrides: Record<string,unknown> = {}, fail = false) {
  return permanentlyDeleteAdminAccount(actor,{targetUserId:target,confirmationText:`DELETE ${email(target)}`,reason:"Isolated admin service validation",...overrides},
    fail ? { afterDelete: () => {throw new Error("Deliberate rollback test");} } : {});
}
try {
  for (const [name,id] of Object.entries(ids)) {
    await pool.query('insert into "user" (id,name,email,email_verified,created_at,updated_at,username,display_username) values ($1,$2,$3,false,now(),now(),$1,$1)',[id,`Admin validation ${name}`,email(id)]);
    await pool.query("insert into user_role (user_id,role) values ($1,$2)",[id,["actor","left","right"].includes(name)?"admin":"player"]);
  }
  await assert.rejects(role(ids.player,ids.target,"admin","true"),/Administrator/);
  await assert.rejects(role(ids.actor,ids.actor,"admin","false"),/own administrator/);
  await assert.rejects(role(ids.actor,ids.target,"invalid","true"),/Invalid/);
  await assert.rejects(role(ids.actor,ids.target,"god","perhaps"),/Invalid/);
  await assert.rejects(role(ids.actor,`${prefix}_missing`,"god","true"),/no longer exists/);
  assert.equal((await role(ids.actor,ids.target,"god","true")).changed,true);
  assert.equal((await role(ids.actor,ids.target,"god","true")).changed,false);
  await role(ids.actor,ids.target,"god","false");
  checks.push("Role writers authorize, reject malformed/unknown requests, prevent self-demotion and are idempotent.");
  await assert.rejects(db.transaction((tx)=>initializeFirstAdministratorInTransaction(tx,ids.player)),/administrator already exists/);
  await assert.rejects(db.transaction(async (tx) => {
    await tx.delete(userRole).where(eq(userRole.role,"admin"));
    await assert.rejects(initializeFirstAdministratorInTransaction(tx,`${prefix}_missing`),/registered account/);
    assert.equal((await initializeFirstAdministratorInTransaction(tx,ids.player)).changed,true);
    assert.equal((await initializeFirstAdministratorInTransaction(tx,ids.player)).changed,false);
    throw new Error("Rollback bootstrap fixture");
  }),/Rollback bootstrap fixture/);
  checks.push("Operator bootstrap requires a registered account, only initializes the first Admin, and is idempotent for that Admin.");
  const raced = await Promise.allSettled([role(ids.left,ids.right,"admin","false"),role(ids.right,ids.left,"admin","false")]);
  assert.equal(raced.filter((result) => result.status === "fulfilled").length,1);
  assert.equal((await pool.query("select count(*)::integer as n from user_role where user_id=any($1::text[]) and role='admin'",[[ids.left,ids.right]])).rows[0].n,1);
  checks.push("Concurrent administrator demotions serialize and recheck the acting administrator after the lock.");
  await assert.rejects(remove(ids.player,ids.target),/Administrator/);
  await assert.rejects(remove(ids.actor,ids.actor),/own account/);
  await assert.rejects(remove(ids.actor,ids.target,{reason:" "}),/reason/);
  await assert.rejects(remove(ids.actor,ids.target,{confirmationText:"DELETE wrong"}),/Type exactly/);
  assert.equal(isPermanentDeletionEnabled({NODE_ENV:"production"}),false);
  assert.equal(isPermanentDeletionEnabled({NODE_ENV:"production",SERRIAN_TIDE_ENABLE_PERMANENT_DELETION:"true"}),true);
  assert.ok(getAccountDeletionProhibitions({actingUserId:ids.actor,targetUserId:ids.left,targetIsAdministrator:true,activeAdministratorCount:1}).some((message)=>message.includes("last administrator")));
  const self = await previewAdminAccountDeletion(ids.actor,ids.actor); assert.equal(self.canDelete,false);
  checks.push("Deletion enforces administrator authority, exact confirmation, required reason, self/last-admin protection and production recovery policy.");
  await assert.rejects(saveSiteAppearance(APPEARANCE_PRESETS.classic,ids.player),/Administrator/);
  await saveSiteAppearance(APPEARANCE_PRESETS.classic,ids.actor); appearanceChanged = true;
  assert.ok((await previewAdminAccountDeletion(ids.left,ids.actor).catch(async()=>previewAdminAccountDeletion(ids.right,ids.actor))).blockers.some((entry)=>entry.label.includes("appearance")));
  checks.push("Appearance publishing is administrator-only and its attribution blocks account deletion.");
  const table = `${prefix}_retained`;
  await pool.query(`create table "${table}" (id serial primary key, user_id text references "user"(id) on delete cascade)`); createdTables.push(table);
  await pool.query(`insert into "${table}" (user_id) values ($1)`,[ids.retained]);
  const retained = await previewAdminAccountDeletion(ids.actor,ids.retained);
  assert.equal(retained.canDelete,false); assert.ok(retained.blockers.some((entry)=>entry.tableName===table));
  await assert.rejects(remove(ids.actor,ids.retained),/retained content or history/);
  assert.equal((await pool.query(`select count(*)::integer as n from "${table}"`)).rows[0].n,1);
  checks.push("New/unrecognized foreign keys block deletion even when the database would cascade away their records.");
  await pool.query("insert into account (id,issuer,account_id,provider_id,user_id,password,created_at,updated_at) values ($1,'credential',$2,'credential',$2,'synthetic-test-hash',now(),now())",[`${prefix}_credential`,ids.target]);
  await pool.query("insert into session (id,token,user_id,expires_at,created_at,updated_at) values ($1,$2,$3,now()+interval '1 day',now(),now())",[`${prefix}_session`,`${prefix}_token`,ids.target]);
  await pool.query("insert into verification (id,identifier,value,expires_at,created_at,updated_at) values ($1,$2,$3,now()+interval '1 day',now(),now())",[`${prefix}_verify`,`${prefix}_verification`,ids.target]);
  await assert.rejects(remove(ids.actor,ids.target,{},true),/rollback test/);
  assert.equal((await pool.query('select id from "user" where id=$1',[ids.target])).rowCount,1);
  assert.equal((await pool.query('select id from session where user_id=$1',[ids.target])).rowCount,1);
  assert.equal((await pool.query('select id from lifecycle_audit_event where target_id=$1',[ids.target])).rowCount,0);
  await remove(ids.actor,ids.target);
  for (const table of ["user","session","account","user_role"]) {
    assert.equal((await pool.query(`select count(*)::integer as n from "${table}" where "${table==='user'?'id':'user_id'}"=$1`,[ids.target])).rows[0].n,0);
  }
  assert.equal((await pool.query('select id from verification where value=$1',[ids.target])).rowCount,0);
  const audit = (await pool.query('select * from lifecycle_audit_event where target_id=$1',[ids.target])).rows[0];
  assert.equal(audit.actor_user_id,ids.actor); assert.equal(audit.reason,"Isolated admin service validation");
  checks.push("Successful deletion cleans credentials/sessions/roles/tokens and retains an audit; injected failure rolls everything back.");
  const empty = await readAdminContentSource();
  assert.equal(empty.availability.campaigns,false); assert.equal(empty.availability.characters,false);
  for (const name of ["campaign","campaign_player","campaign_character","races"]) {
    assert.equal((await pool.query("select to_regclass($1) as name",[`public.${name}`])).rows[0].name,null,"Fixture tables must not replace existing systems");
  }
  await pool.query('create table campaign (id integer primary key,name text,created_by_user_id text references "user"(id),archived_at timestamp,archive_reason text)');createdTables.push("campaign");
  await pool.query('create table campaign_player (campaign_id integer,user_id text references "user"(id))');createdTables.push("campaign_player");
  await pool.query('create table campaign_character (id integer,name text,campaign_id integer,player_user_id text references "user"(id),is_npc boolean,npc_kind text,npc_build_mode text,npc_role_label text,archived_at timestamp,archive_reason text)');createdTables.push("campaign_character");
  await pool.query('create table races (id integer,archived_at timestamp)');createdTables.push("races");
  await pool.query("insert into campaign values (1,'Synthetic campaign',$1,null,''),(2,'Archived campaign',$1,now(),'Fixture')",[ids.player]);
  await pool.query("insert into campaign_player values (1,$1)",[ids.player]);
  await pool.query("insert into campaign_character values (1,'Synthetic PC',1,$1,false,'race',null,'',null,''),(2,'Synthetic race NPC',1,$1,true,'race','simple','Guard',null,''),(3,'Synthetic creature NPC',2,$1,true,'creature','detailed','Beast',now(),'Fixture')",[ids.player]);
  await pool.query('insert into races values (1,null),(2,now())');
  const populated = await readAdminContentSource();
  assert.equal(populated.campaigns.length,2); assert.equal(populated.characters.length,3); assert.equal(populated.memberships.length,1);
  assert.equal(populated.characters.find((entry)=>entry.id === 3)?.npcKind,"creature");
  assert.deepEqual(populated.sharedCatalogs.find((entry)=>entry.key==='races') && [populated.sharedCatalogs[0].active,populated.sharedCatalogs[0].archived],[1,1]);
  assert.equal(populated.sharedCatalogs.find((entry)=>entry.key==='items')?.available,false);
  checks.push("Content adapter distinguishes untransferred systems and reads populated Campaign/PC/NPC/membership/catalog projections accurately.");
  console.log(JSON.stringify({passed:true,checks},null,2));
} finally {
  for (const table of [...createdTables].reverse()) await pool.query(`drop table "${table}"`);
  if (appearanceChanged) {
    if (savedAppearance) await pool.query(`update site_appearance_setting set preset_id=$1,page_background=$2,surface_background=$3,primary_accent=$4,secondary_accent=$5,main_text=$6,muted_text=$7,updated_by_user_id=$8,created_at=$9,updated_at=$10 where key='site'`,[savedAppearance.preset_id,savedAppearance.page_background,savedAppearance.surface_background,savedAppearance.primary_accent,savedAppearance.secondary_accent,savedAppearance.main_text,savedAppearance.muted_text,savedAppearance.updated_by_user_id,savedAppearance.created_at,savedAppearance.updated_at]);
    else await pool.query("delete from site_appearance_setting where key='site' and updated_by_user_id=$1",[ids.actor]);
  }
  await pool.query('delete from lifecycle_audit_event where actor_user_id=any($1::text[])',[Object.values(ids)]);
  await pool.query('delete from verification where value=any($1::text[])',[Object.values(ids)]);
  await pool.query('delete from "user" where id=any($1::text[])',[Object.values(ids)]);
  await pool.end(); await applicationPool.end();
}
