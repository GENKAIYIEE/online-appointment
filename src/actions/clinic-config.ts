"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

const DEFAULT_ALL_SLOTS = [
  "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM",
];

const DEFAULT_ULTRASOUND_SLOTS = ["08:30 AM", "09:30 AM"];

export async function getClinicConfig() {
  try {
    const allSlotsConfig = await prisma.clinicConfig.findUnique({
      where: { key: "ALL_SLOTS" },
    });
    const ultrasoundSlotsConfig = await prisma.clinicConfig.findUnique({
      where: { key: "ULTRASOUND_SLOTS" },
    });

    const allSlots = allSlotsConfig && Array.isArray(allSlotsConfig.value)
      ? (allSlotsConfig.value as string[])
      : DEFAULT_ALL_SLOTS;

    const ultrasoundSlots = ultrasoundSlotsConfig && Array.isArray(ultrasoundSlotsConfig.value)
      ? (ultrasoundSlotsConfig.value as string[])
      : DEFAULT_ULTRASOUND_SLOTS;

    return { allSlots, ultrasoundSlots };
  } catch (error) {
    console.error("Failed to read clinic config:", error);
    return { allSlots: DEFAULT_ALL_SLOTS, ultrasoundSlots: DEFAULT_ULTRASOUND_SLOTS };
  }
}

export async function updateClinicConfig(data: { allSlots: string[]; ultrasoundSlots: string[] }) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!Array.isArray(data.allSlots) || !Array.isArray(data.ultrasoundSlots)) {
      return { success: false, error: "Invalid configuration format." };
    }

    // Basic validation to ensure values look like time slots (e.g. "08:00 AM")
    const timeSlotRegex = /^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (!data.allSlots.every(s => timeSlotRegex.test(s))) {
       return { success: false, error: "Invalid time slot format in General Slots." };
    }
    if (!data.ultrasoundSlots.every(s => timeSlotRegex.test(s))) {
       return { success: false, error: "Invalid time slot format in Ultrasound Slots." };
    }

    const actorId = session.userId || "UNKNOWN";

    await prisma.$transaction(async (tx) => {
      await tx.clinicConfig.upsert({
        where: { key: "ALL_SLOTS" },
        update: { value: data.allSlots, updatedBy: actorId },
        create: { key: "ALL_SLOTS", value: data.allSlots, updatedBy: actorId },
      });

      await tx.clinicConfig.upsert({
        where: { key: "ULTRASOUND_SLOTS" },
        update: { value: data.ultrasoundSlots, updatedBy: actorId },
        create: { key: "ULTRASOUND_SLOTS", value: data.ultrasoundSlots, updatedBy: actorId },
      });

      await createAuditLog(tx, actorId, "UPDATE_CLINIC_CONFIG", "ClinicConfig", "ALL_SLOTS", {
        allSlots: data.allSlots,
        ultrasoundSlots: data.ultrasoundSlots
      });
    });

    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update clinic config:", error);
    return { success: false, error: "Failed to update configuration." };
  }
}
