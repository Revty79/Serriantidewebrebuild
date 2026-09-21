import { requirePageAccess } from "@/lib/server-access";
import { DestinationPlaceholder } from "@/app/destination-placeholder";
export default async function Page() {
  const { session } = await requirePageAccess("god");
  return <DestinationPlaceholder title="The Heavens" name={session.user.name} />;
}
