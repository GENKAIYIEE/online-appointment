import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { HistoryClient } from "./HistoryClient";
import { prisma } from "@/lib/prisma";

type Filters = {
  search?: string;
  startDate?: string;
  endDate?: string;
  service?: string;
  type?: string;
};

export default async function ConsultationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await verifySession();
  if (!session || session.role !== "DOCTOR") {
    redirect("/login");
  }

  const sp = await searchParams;

  const filters: Filters = {
    search: typeof sp.search === "string" ? sp.search : undefined,
    startDate: typeof sp.startDate === "string" ? sp.startDate : undefined,
    endDate: typeof sp.endDate === "string" ? sp.endDate : undefined,
    service: typeof sp.service === "string" ? sp.service : undefined,
    type: typeof sp.type === "string" ? sp.type : undefined,
  };

  const services = await prisma.service.findMany({ 
    where: { assigned_doctor_id: session.userId },
    select: { name: true } 
  });

  return <HistoryClient services={services} />;
}
