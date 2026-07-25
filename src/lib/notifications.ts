import { prisma } from "./prisma";

/**
 * Creates a notification for all users with the ADMIN role.
 */
export async function createAdminNotification(message: string, appointmentId?: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length === 0) return;

    const data = admins.map(admin => ({
      user_id: admin.id,
      message,
      ...(appointmentId ? { appointmentId } : {})
    }));

    await prisma.notification.createMany({
      data,
    });
  } catch (error) {
    console.error("Failed to create admin notification:", error);
  }
}

/**
 * Creates a notification for all users with the STAFF role.
 */
export async function createStaffNotification(message: string, appointmentId?: string) {
  try {
    const staffs = await prisma.user.findMany({
      where: { role: "STAFF" },
      select: { id: true },
    });

    if (staffs.length === 0) return;

    const data = staffs.map(staff => ({
      user_id: staff.id,
      message,
      ...(appointmentId ? { appointmentId } : {})
    }));

    await prisma.notification.createMany({
      data,
    });
  } catch (error) {
    console.error("Failed to create staff notification:", error);
  }
}

/**
 * Creates a notification for a specific doctor.
 */
export async function createDoctorNotification(message: string, doctorId: string, appointmentId?: string) {
  try {
    await prisma.notification.create({
      data: {
        user_id: doctorId,
        message,
        ...(appointmentId ? { appointmentId } : {})
      },
    });
  } catch (error) {
    console.error("Failed to create doctor notification:", error);
  }
}