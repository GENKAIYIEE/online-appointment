import { prisma } from "./prisma";

export async function logAction(
  action: string,
  entity: string,
  entity_id?: string,
  details?: Record<string, any>,
  actor: string = "System Admin"
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entity_id,
        details: details || {},
        actor,
      },
    });
  } catch (error) {
    console.error("[audit] Failed to write audit log:", error);
    // We intentionally don't throw here to avoid failing the primary action
    // just because logging failed, but in a strict system we might.
  }
}

export async function createAuditLog(
  tx: any,
  userId: string,
  action: string,
  targetEntity: string,
  targetId: string | null,
  details?: string | Record<string, any>
) {
  let safeDetails: Record<string, any> = {};
  if (details) {
    if (typeof details === "string") {
      safeDetails = { message: details };
    } else {
      // Create a shallow copy to safely omit passwords
      safeDetails = { ...details };
      if ("password" in safeDetails) delete safeDetails.password;
    }
  }

  await tx.auditLog.create({
    data: {
      action,
      entity: targetEntity,
      entity_id: targetId,
      details: safeDetails,
      actor: userId,
    },
  });
}
