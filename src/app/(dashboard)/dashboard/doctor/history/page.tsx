import { getConsultationHistory } from "@/actions/doctor";
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
  const sp = await searchParams;

  const filters: Filters = {
    search: typeof sp.search === "string" ? sp.search : undefined,
    startDate: typeof sp.startDate === "string" ? sp.startDate : undefined,
    endDate: typeof sp.endDate === "string" ? sp.endDate : undefined,
    service: typeof sp.service === "string" ? sp.service : undefined,
    type: typeof sp.type === "string" ? sp.type : undefined,
  };

  const doctor = await prisma.user.findFirst({ where: { role: "DOCTOR" } });

  if (!doctor) {
    return (
      <div className="p-8 text-center text-slate-500">
        No doctor account found in the system.
      </div>
    );
  }

  const [history, services] = await Promise.all([
    getConsultationHistory(doctor.id, filters),
    prisma.service.findMany({ select: { name: true } }),
  ]);

  return <HistoryClient history={history} services={services} />;
}
