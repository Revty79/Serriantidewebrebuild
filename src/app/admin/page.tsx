import { requirePageAccess } from "@/lib/server-access";
import { DestinationPlaceholder } from "@/app/destination-placeholder";
export default async function Page() {
  const { session } = await requirePageAccess("admin");
  return <DestinationPlaceholder title="Administration" name={session.user.name} />;
}
