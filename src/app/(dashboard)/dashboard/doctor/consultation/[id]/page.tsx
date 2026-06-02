import { getConsultationDetails } from "@/actions/doctor";
import { ConsultationClient } from "./ConsultationClient";
import { redirect } from "next/navigation";

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getConsultationDetails(id);

  if (!result.success || !result.data) {
    redirect("/dashboard/doctor");
  }

  return <ConsultationClient appointment={result.data} />;
}
