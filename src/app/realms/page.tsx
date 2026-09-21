import { requirePageAccess } from "@/lib/server-access";
import { DestinationPlaceholder } from "@/app/destination-placeholder";
export default async function Page() {
  const { session } = await requirePageAccess("player");
  return <DestinationPlaceholder title="The Realms" name={session.user.name} />;
}
