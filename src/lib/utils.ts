import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date value that came from a Postgres DATE column.
 * Postgres DATE columns are returned by Prisma as JS Date objects at
 * UTC midnight (e.g. 2026-06-01T00:00:00.000Z). If we simply call
 * `new Date(val)` and format it, servers or browsers in UTC+8 will
 * interpret UTC midnight as the previous day (May 31 23:00 local time
 * in, say, UTC-1) — or in our case, formatting in Node will use the
 * process timezone. To avoid this we always read the UTC year/month/day
 * directly and build a local midnight Date so date-fns formats the
 * correct calendar date regardless of where the code runs.
 *
 * @param dateVal  A Date object or ISO date string from Prisma.
 * @param formatStr  A date-fns format string, e.g. "MMM d, yyyy".
 */
export function formatDatePHT(dateVal: Date | string | null | undefined, formatStr: string): string {
  if (!dateVal) return "—";
  try {
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    
    // Explicitly extract Manila components using Intl
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;
    
    const year = parseInt(getPart('year') || '0', 10);
    const month = parseInt(getPart('month') || '1', 10) - 1; // JS Date is 0-indexed
    const day = parseInt(getPart('day') || '1', 10);
    
    // Set at 12:00 PM local to avoid any daylight savings/midnight shifting during format
    const localDate = new Date(year, month, day, 12, 0, 0, 0);
    
    return format(localDate, formatStr);
  } catch {
    return "—";
  }
}

/**
 * Returns the start of "today" in Asia/Manila (UTC+8).
 * This is used for Prisma `date >= today` queries so the boundary
 * is the correct Manila calendar day, not UTC midnight.
 *
 * The approach: get the current UTC ms, add 8 hours to get Manila
 * "wall-clock" time, then extract Y/M/D, and return a UTC-midnight
 * Date for that Manila calendar day — which is what Prisma DATE
 * comparisons expect.
 */
export function getTodayPHT(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;
  
  const year = parseInt(getPart('year') || '0', 10);
  const month = parseInt(getPart('month') || '1', 10) - 1;
  const day = parseInt(getPart('day') || '1', 10);

  // Return exactly 12:00 PM UTC to prevent ANY timezone truncation issues by Prisma
  return new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`);
}
