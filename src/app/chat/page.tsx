import { requirePageAccess } from "@/lib/server-access";
import { DestinationPlaceholder } from "@/app/destination-placeholder";
export default async function Page() {
  const { session } = await requirePageAccess();
  return <DestinationPlaceholder title="The Crossroads" name={session.user.name} />;
}
