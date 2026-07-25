"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/lib/audit";

export async function searchPatients(query: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "PATIENT",
        name: {
          contains: query,
          mode: "insensitive",
        }
      },
      select: {
        id: true,
        name: true,
      },
      take: 10,
    });
    return users;
  } catch (error) {
    console.error("Error searching patients:", error);
    return [];
  }
}

export async function getMedicineRecords() {
  try {
    const session = await verifySession();
    if (!session || session.role !== "STAFF") {
      throw new Error("Unauthorized");
    }

    const records = await prisma.medicineRecord.findMany({
      orderBy: { date: "desc" },
      include: {
        patient: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } }
      }
    });
    return { success: true, records };
  } catch (error: any) {
    console.error("Error fetching medicine records:", error);
    return { success: false, error: error.message };
  }
}

export async function getMedicineRecordsByPatient(patientId: string) {
  try {
    const records = await prisma.medicineRecord.findMany({
      where: { patientId },
      orderBy: { date: "desc" },
      include: {
        staff: { select: { id: true, name: true } },
        patient: { select: { id: true, name: true } }
      }
    });
    return { success: true, records };
  } catch (error: any) {
    console.error("Error fetching patient medicine history:", error);
    return { success: false, error: error.message };
  }
}

export async function createMedicineRecord(data: {
  patientId?: string;
  walkInName?: string;
  medicineName: string;
  quantity: number;
  date: string;
  reason?: string;
  notes?: string;
}) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "STAFF") {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.patientId && !data.walkInName) {
      return { success: false, error: "Patient must be selected or walk-in name provided" };
    }
    if (data.patientId && data.walkInName) {
      return { success: false, error: "Cannot provide both a registered patient and a walk-in name" };
    }

    await prisma.$transaction(async (tx) => {
      const record = await tx.medicineRecord.create({
        data: {
          patientId: data.patientId || null,
          walkInName: data.walkInName || null,
          medicineName: data.medicineName,
          quantity: data.quantity,
          date: new Date(data.date),
          reason: data.reason || null,
          notes: data.notes || null,
          staffId: session.userId as string,
        }
      });

      await createAuditLog(tx, session.userId as string, "CREATE_MEDICINE_RECORD", "MedicineRecord", record.id, {
        medicineName: data.medicineName,
        quantity: data.quantity,
      });
    });

    revalidatePath("/dashboard/staff/medicine");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating medicine record:", error);
    return { success: false, error: "Failed to create record" };
  }
}

export async function updateMedicineRecord(id: string, data: {
  patientId?: string;
  walkInName?: string;
  medicineName: string;
  quantity: number;
  date: string;
  reason?: string;
  notes?: string;
}) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "STAFF") {
      return { success: false, error: "Unauthorized" };
    }

    if (!data.patientId && !data.walkInName) {
      return { success: false, error: "Patient must be selected or walk-in name provided" };
    }
    if (data.patientId && data.walkInName) {
      return { success: false, error: "Cannot provide both a registered patient and a walk-in name" };
    }

    await prisma.$transaction(async (tx) => {
      const record = await tx.medicineRecord.update({
        where: { id },
        data: {
          patientId: data.patientId || null,
          walkInName: data.walkInName || null,
          medicineName: data.medicineName,
          quantity: data.quantity,
          date: new Date(data.date),
          reason: data.reason || null,
          notes: data.notes || null,
          // Optional: keep the original staffId or update to the one editing
          // staffId: session.userId as string,
        }
      });

      await createAuditLog(tx, session.userId as string, "UPDATE_MEDICINE_RECORD", "MedicineRecord", id, {
        medicineName: data.medicineName,
        quantity: data.quantity,
      });
    });

    revalidatePath("/dashboard/staff/medicine");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating medicine record:", error);
    return { success: false, error: "Failed to update record" };
  }
}

export async function deleteMedicineRecord(id: string, passwordString: string) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "STAFF") {
      return { success: false, error: "Unauthorized" };
    }

    const staffUser = await prisma.user.findUnique({
      where: { id: session.userId as string }
    });

    if (!staffUser || !staffUser.password) {
      return { success: false, error: "Staff user not found or password missing" };
    }

    const isMatch = await bcrypt.compare(passwordString, staffUser.password);
    if (!isMatch) {
      return { success: false, error: "Incorrect password" };
    }

    await prisma.$transaction(async (tx) => {
      const record = await tx.medicineRecord.findUnique({ where: { id } });
      if (record) {
        await createAuditLog(tx, session.userId as string, "DELETE_MEDICINE_RECORD", "MedicineRecord", id, {
          medicineName: record.medicineName,
          quantity: record.quantity,
        });
        await tx.medicineRecord.delete({
          where: { id }
        });
      }
    });

    revalidatePath("/dashboard/staff/medicine");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting medicine record:", error);
    return { success: false, error: "Failed to delete record" };
  }
}
