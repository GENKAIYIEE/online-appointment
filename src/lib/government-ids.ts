/**
 * Accepted Government-Issued ID types.
 *
 * IMPORTANT: This module is intentionally NOT marked "use client" so it can be
 * imported by BOTH client components (the ID picker UI) and server actions
 * (whitelist validation). Values exported from a "use client" module become
 * client references on the server and cannot be iterated or compared there.
 */
export const GOV_ID_TYPES = [
  "National ID (PhilSys)",
  "UMID / SSS / GSIS Card",
  "Driver's License",
  "Philippine Passport",
  "PhilHealth ID",
  "Postal ID",
] as const;

export type GovIdType = (typeof GOV_ID_TYPES)[number];

export function isGovIdType(value: string | null | undefined): value is GovIdType {
  return !!value && (GOV_ID_TYPES as readonly string[]).includes(value);
}
