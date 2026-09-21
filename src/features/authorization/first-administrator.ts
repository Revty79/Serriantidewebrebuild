import "server-only";
import { sql } from "drizzle-orm";
import { user } from "@/db/auth-schema";
import { userRole } from "@/db/authorization-schema";
import { lockAdministratorRosterInTransaction, type AdminRosterTransaction } from "./admin-roster-lock";

// Operator-only bootstrap. Never expose this function through a public Server Action.
export async function initializeFirstAdministratorInTransaction(tx: AdminRosterTransaction, username: string) {
  const normalized = username.trim().toLowerCase();
  if (!normalized || normalized.length > 255) throw new Error("Provide the username of a newly registered account.");
  const administrators = await lockAdministratorRosterInTransaction(tx);
  const candidates = await tx.select({ id: user.id, username: user.username }).from(user)
    .where(sql`lower(${user.username}) = ${normalized}`).limit(2);
  if (candidates.length !== 1) throw new Error("One registered account with that username must exist before bootstrap.");
  const target = candidates[0];
  if (administrators.includes(target.id)) return { changed: false, username: target.username };
  if (administrators.length > 0) throw new Error("An administrator already exists. Use Admin > Users & Roles to change access.");
  await tx.insert(userRole).values({ userId: target.id, role: "admin" });
  return { changed: true, username: target.username };
}
