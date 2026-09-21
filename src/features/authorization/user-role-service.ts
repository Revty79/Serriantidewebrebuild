import "server-only";

import { and, eq } from "drizzle-orm";

import { user } from "@/db/auth-schema";
import { db } from "@/db";
import { serrianRole, userRole, type SerrianRole } from "@/db/authorization-schema";
import { lockAdministratorRosterInTransaction } from "@/features/authorization/admin-roster-lock";

export type UserRoleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SetUserRoleInput = {
  targetUserId: unknown;
  requestedRole: unknown;
  enabled: unknown;
};

export async function setUserRoleInTransaction(
  tx: UserRoleTransaction,
  actingUserId: string,
  input: SetUserRoleInput,
): Promise<{ changed: boolean; role: SerrianRole; enabled: boolean }> {
  await lockAdministratorRosterInTransaction(tx);
  const [adminAccess] = await tx
    .select({ role: userRole.role })
    .from(userRole)
    .where(and(eq(userRole.userId, actingUserId), eq(userRole.role, "admin")))
    .limit(1);
  if (!adminAccess) throw new Error("Administrator access is required.");

  if (
    typeof input.targetUserId !== "string"
    || typeof input.requestedRole !== "string"
    || typeof input.enabled !== "string"
  ) {
    throw new Error("Invalid role request.");
  }
  if (!serrianRole.enumValues.includes(input.requestedRole as SerrianRole)) {
    throw new Error("Invalid Serrian Tide role.");
  }

  if (input.enabled !== "true" && input.enabled !== "false") throw new Error("Invalid role request.");
  const [target] = await tx.select({ id: user.id }).from(user).where(eq(user.id, input.targetUserId)).limit(1);
  if (!target) throw new Error("That User account no longer exists.");
  const role = input.requestedRole as SerrianRole;
  const enabled = input.enabled === "true";
  if (input.targetUserId === actingUserId && role === "admin" && !enabled) {
    throw new Error("You cannot remove your own administrator access.");
  }

  const changedRows = enabled
    ? await tx
        .insert(userRole)
        .values({ userId: input.targetUserId, role })
        .onConflictDoNothing()
        .returning({ userId: userRole.userId })
    : await tx
        .delete(userRole)
        .where(and(eq(userRole.userId, input.targetUserId), eq(userRole.role, role)))
        .returning({ userId: userRole.userId });

  // Every protected request reloads current roles. Live Chat/Tabletop events return with those modules.
  return { changed: changedRows.length > 0, role, enabled };
}
