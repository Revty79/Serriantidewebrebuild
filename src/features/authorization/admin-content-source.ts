import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { AdminContentCampaignRow, AdminContentCharacterRow } from "./admin-content-overview";

const catalogs = [
  { key: "races", table: "races", label: "Races", href: "/heavens/races" },
  { key: "creatures", table: "creatures", label: "Creatures", href: "/heavens/creatures" },
  { key: "skills", table: "skill", label: "Skills", href: "/heavens/skills" },
  { key: "items", table: "items", label: "Items & Equipment", href: "/heavens/inventory" },
  { key: "derived-abilities", table: "derived_ability", label: "Derived Abilities", href: "/heavens/derived-abilities" },
] as const;

// Read-only compatibility boundary. No legacy gameplay tables are created here.
// A later system transfer must preserve these projections or update this adapter.
export async function readAdminContentSource() {
  const found = await db.execute(sql<{ table_name: string; column_name: string }>`
    select table_name, column_name from information_schema.columns where table_schema = 'public'
      and table_name in ('campaign','campaign_player','campaign_character','races','creatures','skill','items','derived_ability')`);
  const columns = new Set(found.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const has = (table: string, names: string[]) => names.every((name) => columns.has(`${table}.${name}`));
  const campaignsAvailable = has("campaign", ["id","name","created_by_user_id","archived_at","archive_reason"]);
  const charactersAvailable = campaignsAvailable && has("campaign_character", ["id","name","campaign_id","player_user_id","is_npc","npc_kind","npc_build_mode","npc_role_label","archived_at","archive_reason"]);
  const membershipsAvailable = campaignsAvailable && has("campaign_player", ["campaign_id","user_id"]);
  const campaigns = campaignsAvailable ? (await db.execute<AdminContentCampaignRow>(sql`select id, name, created_by_user_id as "createdByUserId", archived_at as "archivedAt", archive_reason as "archiveReason" from public.campaign order by name,id`)).rows : [];
  const characters = charactersAvailable ? (await db.execute<AdminContentCharacterRow>(sql`
    select cc.id,cc.name,c.id as "campaignId",c.name as "campaignName",c.archived_at as "campaignArchivedAt",
      c.created_by_user_id as "campaignOwnerUserId",cc.player_user_id as "controllerUserId",
      cc.is_npc as "isNpc",cc.npc_kind as "npcKind",cc.npc_build_mode as "npcBuildMode",cc.npc_role_label as "npcRoleLabel",
      cc.archived_at as "archivedAt",cc.archive_reason as "archiveReason"
    from public.campaign_character cc join public.campaign c on c.id=cc.campaign_id order by c.name,cc.name,cc.id`)).rows : [];
  const memberships = membershipsAvailable ? (await db.execute<{ campaignId: number; userId: string }>(sql`select campaign_id as "campaignId", user_id as "userId" from public.campaign_player`)).rows : [];
  const sharedCatalogs = await Promise.all(catalogs.map(async (catalog) => {
    const available = has(catalog.table, ["archived_at"]);
    const row = available ? (await db.execute(sql<{ active: number; archived: number }>`
      select count(*) filter (where archived_at is null)::integer as active,
        count(*) filter (where archived_at is not null)::integer as archived
      from public.${sql.identifier(catalog.table)}`)).rows[0] : undefined;
    return { key: catalog.key, label: catalog.label, href: catalog.href, available,
      active: Number(row?.active ?? 0), archived: Number(row?.archived ?? 0) };
  }));
  return { campaigns, characters, memberships, sharedCatalogs,
    availability: { campaigns: campaignsAvailable, memberships: membershipsAvailable, characters: charactersAvailable } };
}
