"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type SubProfileData = {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthday?: string; // ISO date string YYYY-MM-DD
  gender?: string;
  relationship: string;
};

// ──────────────────────────────────────────────────────────
// GET all sub-profiles for the current session user
// ──────────────────────────────────────────────────────────
export async function getSubProfiles() {
  try {
    const session = await verifySession();
    if (!session || session.role !== "PATIENT") {
      return { success: false, error: "Not authenticated", data: [] };
    }

    const subProfiles = await prisma.subProfile.findMany({
      where: { ownerId: session.userId },
      include: { itr: true },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, data: subProfiles };
  } catch (error: any) {
    console.error("Error fetching sub-profiles:", error);
    return { success: false, error: "Failed to load family profiles.", data: [] };
  }
}

// ──────────────────────────────────────────────────────────
// ADD a new sub-profile
// ──────────────────────────────────────────────────────────
export async function addSubProfile(data: SubProfileData) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "PATIENT") {
      return { success: false, error: "Not authenticated" };
    }

    // Limit: max 10 sub-profiles per account
    const count = await prisma.subProfile.count({
      where: { ownerId: session.userId },
    });
    if (count >= 10) {
      return {
        success: false,
        error: "You have reached the maximum of 10 family profiles.",
      };
    }

    const subProfile = await prisma.subProfile.create({
      data: {
        ownerId: session.userId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        middleName: data.middleName?.trim() || null,
        birthday: data.birthday ? new Date(`${data.birthday}T00:00:00Z`) : null,
        gender: data.gender || null,
        relationship: data.relationship,
      },
    });

    revalidatePath("/dashboard/patient/family");
    revalidatePath("/dashboard/patient/book");
    return { success: true, data: subProfile };
  } catch (error: any) {
    console.error("Error adding sub-profile:", error);
    return { success: false, error: "Failed to add family profile." };
  }
}

// ──────────────────────────────────────────────────────────
// UPDATE a sub-profile
// ──────────────────────────────────────────────────────────
export async function updateSubProfile(id: string, data: SubProfileData) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "PATIENT") {
      return { success: false, error: "Not authenticated" };
    }

    // Ownership check
    const existing = await prisma.subProfile.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== session.userId) {
      return { success: false, error: "Profile not found or access denied." };
    }

    const subProfile = await prisma.subProfile.update({
      where: { id },
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        middleName: data.middleName?.trim() || null,
        birthday: data.birthday ? new Date(`${data.birthday}T00:00:00Z`) : null,
        gender: data.gender || null,
        relationship: data.relationship,
      },
    });

    revalidatePath("/dashboard/patient/family");
    revalidatePath("/dashboard/patient/book");
    return { success: true, data: subProfile };
  } catch (error: any) {
    console.error("Error updating sub-profile:", error);
    return { success: false, error: "Failed to update family profile." };
  }
}

// ──────────────────────────────────────────────────────────
// DELETE a sub-profile (blocked if active CONFIRMED appointments exist)
// ──────────────────────────────────────────────────────────
export async function deleteSubProfile(id: string) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "PATIENT") {
      return { success: false, error: "Not authenticated" };
    }

    // Ownership check
    const existing = await prisma.subProfile.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== session.userId) {
      return { success: false, error: "Profile not found or access denied." };
    }

    // Block deletion if active appointments exist
    const activeAppointments = await prisma.appointment.count({
      where: {
        subProfileId: id,
        status: "CONFIRMED",
      },
    });

    if (activeAppointments > 0) {
      return {
        success: false,
        error: `Cannot delete this profile — they have ${activeAppointments} active appointment(s). Please cancel them first.`,
      };
    }

    await prisma.subProfile.delete({ where: { id } });

    revalidatePath("/dashboard/patient/family");
    revalidatePath("/dashboard/patient/book");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting sub-profile:", error);
    return { success: false, error: "Failed to delete family profile." };
  }
}
