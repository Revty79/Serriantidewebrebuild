import { AuthenticatedNavigation } from "@/app/authenticated-navigation";
import { requirePageAccess } from "@/lib/server-access";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await requirePageAccess("admin");
  return <><AuthenticatedNavigation context="admin" roles={access.roles} username={access.session.user.username ?? access.session.user.name} />{children}</>;
}
