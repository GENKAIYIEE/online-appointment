"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { isRelationshipDocType, isValidDocDataUrl } from "@/lib/relationship-documents";

const RELATIONSHIPS = ["Child", "Spouse", "Parent", "Sibling", "Grandchild", "Grandparent", "Other"];

/**
 * Proof-of-Relationship documents reuse the legacy ID columns:
 *   idType        → document type (see RELATIONSHIP_DOC_TYPES)
 *   idCardUrl     → page 1 (required)
 *   idCardBackUrl → page 2 (optional)
 *
 * On UPDATE: `undefined` means "unchanged"; for idCardBackUrl, "" means "remove".
 */
export type SubProfileData = {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthday?: string; // ISO date string YYYY-MM-DD
  gender?: string;
  relationship: string;
  idType?: string;
  idNumber?: string;
  idCardUrl?: string;
  idCardBackUrl?: string;
};

function validateBasics(data: SubProfileData): string | null {
  if (!data?.firstName?.trim() || !data?.lastName?.trim()) {
    return "First name and last name are required.";
  }
  if (data.firstName.length > 100 || data.lastName.length > 100 || (data.middleName?.length ?? 0) > 100) {
    return "Names must be 100 characters or fewer.";
  }
  if (!RELATIONSHIPS.includes(data.relationship)) {
    return "Please select a valid relationship.";
  }
  if (!isRelationshipDocType(data.idType)) {
    return "Please select a valid proof of relationship document type.";
  }
  return null;
}

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

    const basicsError = validateBasics(data);
    if (basicsError) return { success: false, error: basicsError };

    if (!isValidDocDataUrl(data.idCardUrl)) {
      return {
        success: false,
        error: "Please attach a clear image (JPG, PNG, or WEBP) of the proof of relationship document.",
      };
    }
    if (data.idCardBackUrl && !isValidDocDataUrl(data.idCardBackUrl)) {
      return { success: false, error: "The additional page is not a valid image. Please re-upload it." };
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
        idType: data.idType,
        idNumber: null,
        idCardUrl: data.idCardUrl,
        idCardBackUrl: data.idCardBackUrl || null,
        idStatus: "PENDING",
        idRejectionReason: null,
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

    const basicsError = validateBasics(data);
    if (basicsError) return { success: false, error: basicsError };

    // Ownership check
    const existing = await prisma.subProfile.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== session.userId) {
      return { success: false, error: "Profile not found or access denied." };
    }

    // Validate any newly uploaded documents
    const newPage1 = data.idCardUrl;
    const newPage2 = data.idCardBackUrl;
    if (newPage1 !== undefined && !isValidDocDataUrl(newPage1)) {
      return {
        success: false,
        error: "Please attach a clear image (JPG, PNG, or WEBP) of the proof of relationship document.",
      };
    }
    if (newPage1 === undefined && !existing.idCardUrl) {
      return { success: false, error: "Please upload a proof of relationship document." };
    }
    if (newPage2 !== undefined && newPage2 !== "" && !isValidDocDataUrl(newPage2)) {
      return { success: false, error: "The additional page is not a valid image. Please re-upload it." };
    }

    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();

    // Re-verification is required only when something the document vouches
    // for has changed (documents, doc type, relationship, or the person's name).
    const needsReverification =
      newPage1 !== undefined ||
      newPage2 !== undefined ||
      data.idType !== existing.idType ||
      data.relationship !== existing.relationship ||
      firstName !== existing.firstName ||
      lastName !== existing.lastName;

    const subProfile = await prisma.subProfile.update({
      where: { id },
      data: {
        firstName,
        lastName,
        middleName: data.middleName?.trim() || null,
        birthday: data.birthday ? new Date(`${data.birthday}T00:00:00Z`) : null,
        gender: data.gender || null,
        relationship: data.relationship,
        idType: data.idType,
        ...(newPage1 !== undefined && { idCardUrl: newPage1 }),
        ...(newPage2 !== undefined && { idCardBackUrl: newPage2 || null }),
        ...(needsReverification && { idStatus: "PENDING", idRejectionReason: null }),
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
