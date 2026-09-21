import type { SerrianRole } from "@/db/authorization-schema";
export type SerrianAppRole = SerrianRole;
export type AuthenticatedContext = "admin" | "heavens" | "realms";
export type AuthenticatedNavigationItem = { label: string; href: string };
const destinations = [
  { role: "admin", label: "Admin", href: "/admin" },
  { role: "god", label: "Heavens", href: "/heavens" },
  { role: "player", label: "Realms", href: "/realms" },
] as const;
export function getContextHomeHref(context: AuthenticatedContext) { return `/${context}`; }
export function getContextNavigationItems(context: AuthenticatedContext): AuthenticatedNavigationItem[] {
  if (context !== "admin") return [{ label: "Choose Your Path", href: "/access" }];
  return [
    { label: "Admin Dashboard", href: "/admin" },
    { label: "Users & Roles", href: "/admin/users" },
    { label: "Content Overview", href: "/admin/content" },
    { label: "Appearance", href: "/admin/appearance" },
    { label: "Crossroads", href: "/chat" },
  ];
}
export function getAlternateRoleDestinations(roles: readonly SerrianAppRole[], context: AuthenticatedContext) {
  return destinations.filter((item) => roles.includes(item.role) && item.href !== getContextHomeHref(context));
}
export function isNavigationItemActive(pathname: string, item: AuthenticatedNavigationItem) {
  return pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
}
export function getNavigationBreadcrumbs(pathname: string, context: AuthenticatedContext) {
  const items = getContextNavigationItems(context);
  const links = [items[0]];
  const active = items.slice(1).find((item) => isNavigationItemActive(pathname, item));
  if (active) links.push(active);
  if (/^\/admin\/users\/[^/]+$/.test(pathname)) links.push({ label: "User Account", href: pathname });
  return links.map((item, index) => ({ ...item, current: index === links.length - 1 }));
}
