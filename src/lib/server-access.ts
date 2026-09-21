import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { userRole, type SerrianRole } from "@/db/authorization-schema";
import { auth } from "@/lib/auth";

export async function requirePageAccess(role?: SerrianRole) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const assignments = await db.select({ role: userRole.role }).from(userRole).where(eq(userRole.userId, session.user.id));
  const roles = assignments.map(({ role }) => role);
  if (role ? !roles.includes(role) : roles.length === 0) redirect("/access?denied=1");
  return { session, roles };
}

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("You must be signed in.");
  }

  return session;
}

export async function requireRole(role: "admin" | "god" | "player") {
  return (await requireAccessContext(role)).session;
}

async function loadAccessContext(): Promise<{
  session: Awaited<ReturnType<typeof requireSession>>;
  roles: SerrianRole[];
}> {
  const session = await requireSession();

  const access = await db
    .select({ role: userRole.role })
    .from(userRole)
    .where(eq(userRole.userId, session.user.id));
  const roles = access.map(({ role: assignedRole }) => assignedRole);

  return { session, roles };
}

export async function requireAccessContext(
  role: "admin" | "god" | "player",
): Promise<{ session: Awaited<ReturnType<typeof requireSession>>; roles: SerrianRole[] }> {
  const context = await loadAccessContext();

  if (!context.roles.includes(role)) {
    throw new Error(`${role === "god" ? "G.O.D." : role} access is required.`);
  }

  return context;
}

export async function requireGodOrAdminAccessContext(): Promise<{
  session: Awaited<ReturnType<typeof requireSession>>;
  roles: SerrianRole[];
}> {
  const context = await loadAccessContext();
  if (!context.roles.includes("god") && !context.roles.includes("admin")) {
    throw new Error("G.O.D. or administrator access is required.");
  }
  return context;
}

export function requireAdmin() {
  return requireRole("admin");
}

export function requireGod() {
  return requireRole("god");
}

export function requirePlayer() {
  return requireRole("player");
}
