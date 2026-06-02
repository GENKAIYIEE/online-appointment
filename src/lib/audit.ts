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
