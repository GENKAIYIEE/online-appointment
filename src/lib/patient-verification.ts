import { prisma } from "@/lib/prisma";

/**
 * Server-side enforcement of ID / proof-of-relationship verification.
 *
 * The patient layout's <VerificationGuard> only hides the UI. Server actions can
 * be invoked directly, so booking-type actions MUST call this before writing.
 *
 * NOT a "use server" module on purpose: it is an internal helper that must never
 * be exposed as a client-callable action.
 *
 * @param userId       The authenticated patient (from verifySession()).
 * @param subProfileId Optional family member the action is being performed for.
 * @returns A user-facing error string if the action must be blocked, otherwise null.
 */
export async function getVerificationBlockReason(
  userId: string,
  subProfileId?: string | null
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { idStatus: true },
  });

  if (!user) return "Account not found. Please log in again.";

  if (user.idStatus !== "VERIFIED") {
    return "Your account is not verified yet. Please submit a valid Government ID from your dashboard and wait for approval before booking.";
  }

  if (subProfileId) {
    const sub = await prisma.subProfile.findUnique({
      where: { id: subProfileId },
      select: { ownerId: true, idStatus: true },
    });

    // Same message for "missing" and "not yours" so we don't reveal which IDs exist.
    if (!sub || sub.ownerId !== userId) {
      return "Family profile not found or access denied.";
    }

    if (sub.idStatus !== "VERIFIED") {
      return "This family member's proof of relationship has not been verified yet. Please wait for approval or update the document from Family Profiles.";
    }
  }

  return null;
}
