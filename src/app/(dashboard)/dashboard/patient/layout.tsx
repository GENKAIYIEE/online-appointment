import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { VerificationGuard } from "@/components/patient/VerificationGuard";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  // Check ID Status and whether ID has been uploaded
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { idStatus: true, idRejectionReason: true, idCardUrl: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <VerificationGuard
      idStatus={user.idStatus}
      idRejectionReason={user.idRejectionReason}
      hasUploadedId={!!user.idCardUrl}
    >
      {children}
    </VerificationGuard>
  );
}
