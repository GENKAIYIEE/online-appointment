import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDatePHT } from "@/lib/utils";
import BookAppointmentClient from "./BookAppointmentClient";
import { getServices } from "@/actions/slots-management";

export default async function BookAppointmentPage() {
  const session = await verifySession();

  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const patientId = session.userId;

  // Fetch patient details to pre-fill the form
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    include: { itr: true }
  });

  if (!patient) {
    redirect("/login");
  }

  if (!patient.itr?.isCompleted) {
    redirect("/dashboard/patient/itr");
  }

  // Pass necessary patient info to client component
  const patientInfo = {
    name: patient.name,
    phone: patient.phone || "Not provided",
    dob: patient.birthday ? formatDatePHT(patient.birthday, "M/d/yyyy") : "Not specified",
    gender: patient.gender || "Not specified"
  };

  const services = await getServices();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Book an Appointment</h1>
        <p className="text-slate-500">Select a service, date, and available time slot for your visit.</p>
      </div>

      <BookAppointmentClient patientInfo={patientInfo} services={services} />
    </div>
  );
}
