/**
 * Shared TypeScript interfaces for the RHU Agoo Online Appointment System.
 * Prisma-generated types live in @/generated/prisma.
 * This file defines additional app-level types and utility types.
 */

// Re-export Prisma enums for convenient usage throughout the app
export type { Role, AppointmentStatus, AppointmentType } from "@/generated/prisma/client";

// =============================================
// API / Server Action Response Types
// =============================================

export type ActionResult<T = undefined> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

// =============================================
// Appointment Types (with relations)
// =============================================

export interface AppointmentWithRelations {
  id: string;
  status: string;
  type: string;
  created_at: Date;
  user: {
    id: string;
    name: string;
    phone: string | null;
  };
  schedule: {
    id: string;
    date: Date;
    max_capacity: number;
    booked_count: number;
  };
}

// =============================================
// Schedule Types
// =============================================

export interface ScheduleWithCount {
  id: string;
  date: Date;
  max_capacity: number;
  booked_count: number;
  available_slots: number;
}
