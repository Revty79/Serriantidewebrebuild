import "server-only";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { requireAdmin } from "@/lib/server-access";
import { buildAdminContentOverview } from "./admin-content-overview";
import { readAdminContentSource } from "./admin-content-source";
export async function getAdminContentOverview() {
  await requireAdmin();
  const source = await readAdminContentSource();
  const accounts = await db.select({ id: user.id, name: user.name, username: user.username, displayUsername: user.displayUsername }).from(user);
  const overview = buildAdminContentOverview({ accounts, campaigns: source.campaigns, characters: source.characters, sharedCatalogs: source.sharedCatalogs });
  return { ...overview,
    sharedCatalogs: overview.sharedCatalogs.map((entry,index) => ({ ...entry, available: source.sharedCatalogs[index].available })),
    availability: { campaigns: source.availability.campaigns, playerCharacters: source.availability.characters,
      raceNpcs: source.availability.characters, creatureNpcs: source.availability.characters },
  };
}
