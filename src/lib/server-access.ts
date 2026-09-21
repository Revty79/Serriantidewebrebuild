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
