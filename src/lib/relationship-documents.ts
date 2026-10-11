/**
 * Proof-of-Relationship document definitions for family sub-profiles.
 *
 * IMPORTANT: This module is intentionally NOT marked "use client" so it can be
 * imported by BOTH client components (for the picker UI) and server actions
 * (for whitelist validation). Values exported from a "use client" module are
 * turned into client references on the server and cannot be used there.
 *
 * Storage note: to avoid a database migration, relationship documents reuse the
 * existing SubProfile columns:
 *   - idType        → document type (one of RELATIONSHIP_DOC_TYPES)
 *   - idCardUrl     → page 1 / primary document (required)
 *   - idCardBackUrl → page 2 / additional document (optional)
 */

export const RELATIONSHIP_DOC_TYPES = [
  "PSA Birth Certificate",
  "PSA Marriage Certificate",
  "Certificate of Live Birth",
  "Adoption Papers / Court Decree",
  "Guardianship / Legal Custody Order",
  "Barangay Certificate of Relationship",
  "Affidavit of Relationship",
  "Other Supporting Document",
] as const;

export type RelationshipDocType = (typeof RELATIONSHIP_DOC_TYPES)[number];

export function isRelationshipDocType(value: string | null | undefined): value is RelationshipDocType {
  return !!value && (RELATIONSHIP_DOC_TYPES as readonly string[]).includes(value);
}

/** Contextual guidance shown to the user based on the selected relationship. */
export const RELATIONSHIP_DOC_HINTS: Record<string, string> = {
  Child: "Upload your child's birth certificate showing you as the parent.",
  Spouse: "Upload your marriage certificate.",
  Parent: "Upload YOUR birth certificate showing them as your parent.",
  Sibling:
    "Upload both your birth certificate and your sibling's (use Page 2 for the second one) showing the same parent(s).",
  Grandchild:
    "Upload your grandchild's birth certificate and their parent's birth certificate (use Page 2) to show the link.",
  Grandparent:
    "Upload your birth certificate and your parent's birth certificate (use Page 2) to show the link.",
  Other:
    "Upload a Barangay Certificate of Relationship, guardianship order, or affidavit proving you are part of the same household.",
};

/** Accepted image/document MIME types for uploaded documents. */
export const RELATIONSHIP_DOC_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

/**
 * Hard cap for a single stored data URL (characters). The client compresses
 * images to roughly 150–500 KB before upload, so this leaves generous headroom
 * while preventing oversized payloads from being written to the database.
 */
export const MAX_DOC_DATA_URL_LENGTH = 2_500_000; // ≈ 1.8 MB binary

const DATA_URL_PATTERN = /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Server-side validation of an uploaded document data URL. */
export function isValidDocDataUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.length > MAX_DOC_DATA_URL_LENGTH) return false;
  return DATA_URL_PATTERN.test(value);
}
