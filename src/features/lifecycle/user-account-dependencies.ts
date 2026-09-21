import "server-only";
import { sql } from "drizzle-orm";
import type { AdminAccountLifecycleTransaction, AdminAccountDeletionDependency } from "./admin-account-lifecycle-service";

// Only login associations may be cleaned up automatically. All current and future
// content references block deletion, including ON DELETE CASCADE / SET NULL FKs.
const references: Record<string, { label: string; cleanup?: boolean }> = {
  "account.user_id": { label: "Login credentials", cleanup: true },
  "session.user_id": { label: "Active sessions", cleanup: true },
  "user_role.user_id": { label: "Assigned roles", cleanup: true },
  "site_appearance_setting.updated_by_user_id": { label: "Site appearance update attribution" },
  "lifecycle_audit_event.actor_user_id": { label: "Lifecycle audit attribution" },
};
type ForeignKey = { schema_name: string; table_name: string; column_name: string; constraint_name: string; width: number };
export async function collectUserDependencies(tx: AdminAccountLifecycleTransaction, targetUserId: string): Promise<AdminAccountDeletionDependency[]> {
  const found = await tx.execute(sql<ForeignKey>`
    select n.nspname as schema_name, t.relname as table_name, a.attname as column_name,
           c.conname as constraint_name, cardinality(c.conkey) as width
    from pg_constraint c join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public."user"'::regclass
    order by n.nspname, t.relname, c.conname
  `);
  const dependencies: AdminAccountDeletionDependency[] = [];
  for (const row of found.rows as ForeignKey[]) {
    if (row.width !== 1) throw new Error("Account deletion is unavailable until a new compound account relationship has been reviewed.");
    const known = row.schema_name === "public" ? references[`${row.table_name}.${row.column_name}`] : undefined;
    const counted = await tx.execute(sql<{ value: number }>`select count(*)::integer as value
      from ${sql.identifier(row.schema_name)}.${sql.identifier(row.table_name)}
      where ${sql.identifier(row.column_name)} = ${targetUserId}`);
    dependencies.push({ key: `${row.schema_name}.${row.constraint_name}`,
      label: known?.label ?? `Retained records: ${row.table_name} (${row.column_name})`,
      tableName: row.table_name, columnName: row.column_name,
      count: Number(counted.rows[0]?.value ?? 0), blocking: !known?.cleanup });
  }
  return dependencies;
}
