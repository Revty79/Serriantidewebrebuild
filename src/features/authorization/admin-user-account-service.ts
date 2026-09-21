import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { userRole } from "@/db/authorization-schema";
import { requireAdmin } from "@/lib/server-access";
import { buildAdminUserAccountSummary } from "./admin-user-account";
import { readAdminContentSource } from "./admin-content-source";
export async function getAdminUserAccountSummary(userId: string) {
  await requireAdmin();
  const [account] = await db.select({ id: user.id, name: user.name, username: user.username,
    displayUsername: user.displayUsername, email: user.email, createdAt: user.createdAt }).from(user).where(eq(user.id,userId)).limit(1);
  if (!account) return null;
  const [roleRows, source] = await Promise.all([
    db.select({ role: userRole.role }).from(userRole).where(eq(userRole.userId,userId)), readAdminContentSource(),
  ]);
  const joined = new Set(source.memberships.filter((entry) => entry.userId === userId).map((entry) => entry.campaignId));
  return { ...buildAdminUserAccountSummary({ account, roles: roleRows.map(({role}) => role),
    campaignsCreated: source.campaigns.filter((entry) => entry.createdByUserId === userId).map(({id,name}) => ({id,name})),
    campaignsJoined: source.campaigns.filter((entry) => joined.has(entry.id)).map(({id,name}) => ({id,name})),
    characters: source.characters.filter((entry) => entry.controllerUserId === userId).map(({id,name,campaignId,campaignName,isNpc,npcKind}) => ({id,name,campaignId,campaignName,isNpc,npcKind})),
  }), availability: {
    campaignsCreated: source.availability.campaigns, campaignsJoined: source.availability.memberships,
    playerCharacters: source.availability.characters, raceNpcsControlled: source.availability.characters,
    creatureNpcsControlled: source.availability.characters,
  } };
}
