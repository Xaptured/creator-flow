/**
 * Timezone conversion utilities using date-fns-tz.
 *
 * Design:
 * - The backend always works in UTC.
 * - The frontend displays and accepts times in the user's chosen IANA timezone.
 * - toUtcIso: convert a datetime-local string (interpreted in userTimezone) → UTC ISO string.
 * - toLocalDatetimeLocal: convert a UTC ISO string → datetime-local string in userTimezone.
 * - formatInTimezone: convert a UTC ISO string → a human-readable string in userTimezone.
 */

import { fromZonedTime, toZonedTime, format } from 'date-fns-tz'

/**
 * Convert a datetime-local string (e.g. "2026-05-20T14:30") interpreted
 * in the user's timezone to a UTC ISO-8601 string.
 *
 * @param localDatetimeStr - HTML datetime-local value ("YYYY-MM-DDTHH:mm")
 * @param timezone - IANA timezone string (e.g. "Asia/Kolkata")
 * @returns UTC ISO string (e.g. "2026-05-20T09:00:00.000Z")
 */
export function toUtcIso(localDatetimeStr: string, timezone: string): string {
  // fromZonedTime treats the input as being in `timezone` and returns a Date in UTC
  const utcDate = fromZonedTime(localDatetimeStr, timezone)
  return utcDate.toISOString()
}

/**
 * Convert a UTC ISO string to a datetime-local compatible string ("YYYY-MM-DDTHH:mm")
 * in the user's timezone, suitable for use as the value of an HTML datetime-local input.
 *
 * @param utcIso - UTC ISO string (e.g. "2026-05-20T09:00:00.000Z")
 * @param timezone - IANA timezone string (e.g. "Asia/Kolkata")
 * @returns datetime-local string (e.g. "2026-05-20T14:30")
 */
export function toLocalDatetimeLocal(utcIso: string, timezone: string): string {
  const zonedDate = toZonedTime(new Date(utcIso), timezone)
  return format(zonedDate, "yyyy-MM-dd'T'HH:mm", { timeZone: timezone })
}

/**
 * Format a UTC ISO string for display in the user's timezone.
 *
 * @param utcIso - UTC ISO string
 * @param timezone - IANA timezone string
 * @param fmt - date-fns format string (default: "MMM d, yyyy h:mm a zzz")
 * @returns Human-readable local time string
 */
export function formatInTimezone(
  utcIso: string,
  timezone: string,
  fmt = 'MMM d, yyyy h:mm a zzz'
): string {
  const zonedDate = toZonedTime(new Date(utcIso), timezone)
  return format(zonedDate, fmt, { timeZone: timezone })
}

/**
 * Get the local date components (year, month, day) for a UTC ISO string
 * in a given timezone, used to place events on calendar cells.
 *
 * @param utcIso - UTC ISO string
 * @param timezone - IANA timezone string
 * @returns { year, month (0-indexed), day }
 */
export function getLocalDateParts(
  utcIso: string,
  timezone: string
): { year: number; month: number; day: number } {
  const zonedDate = toZonedTime(new Date(utcIso), timezone)
  return {
    year: zonedDate.getFullYear(),
    month: zonedDate.getMonth(),
    day: zonedDate.getDate(),
  }
}
