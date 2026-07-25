import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { getSubProfiles } from "@/actions/sub-profiles";
import { FamilyProfilesClient } from "./FamilyProfilesClient";

export const metadata = {
  title: "Family Profiles | RHU Patient Portal",
  description: "Manage family and household member profiles for booking appointments.",
};

export default async function FamilyProfilesPage() {
  const session = await verifySession();
  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const { data: subProfiles } = await getSubProfiles();

  return (
    <FamilyProfilesClient
      ownerName={session.name}
      initialProfiles={subProfiles ?? []}
    />
  );
}
