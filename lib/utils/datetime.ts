/**
 * Business timezone helpers.
 *
 * Rule of thumb:
 * - Store appointment boundaries as timestamptz in Postgres (UTC under the hood).
 * - Interpret "calendar day" and working hours in Europe/Bucharest.
 * - Convert only at the edges (UI display + slot generation inputs).
 */

export const BUSINESS_TIMEZONE =
  process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE ?? "Europe/Bucharest";

import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  addDays,
  addMinutes,
  format,
  parse,
  startOfDay,
  startOfWeek,
} from "date-fns";

/** YYYY-MM-DD in business timezone */
export function toBusinessDateString(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy-MM-dd");
}

/** HH:mm in business timezone */
export function toBusinessTimeString(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "HH:mm");
}

/** Human-friendly date in Romanian locale, business TZ */
export function formatBusinessDate(date: Date, pattern = "EEE d MMM"): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, pattern);
}

export function formatBusinessDateTime(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "EEE d MMM, HH:mm");
}

/**
 * Build a timestamptz Instant for a local wall-clock time on a business date.
 * Example: ("2026-09-14", "09:00") → Date representing 09:00 Europe/Bucharest that day.
 */
export function businessLocalToUtc(
  dateStr: string,
  timeStr: string,
): Date {
  const local = parse(`${dateStr} ${timeStr}`, "yyyy-MM-dd HH:mm", new Date());
  return fromZonedTime(local, BUSINESS_TIMEZONE);
}

/** Start of a calendar day in business timezone, as UTC Date */
export function startOfBusinessDay(dateStr: string): Date {
  return businessLocalToUtc(dateStr, "00:00");
}

/** Exclusive end of a calendar day in business timezone */
export function endOfBusinessDay(dateStr: string): Date {
  const next = format(
    addDays(parse(dateStr, "yyyy-MM-dd", new Date()), 1),
    "yyyy-MM-dd",
  );
  return businessLocalToUtc(next, "00:00");
}

export function addMinutesUtc(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

/** Weekday 0=Sunday … 6=Saturday in business timezone (matches Postgres EXTRACT(DOW)) */
export function businessDayOfWeek(dateStr: string): number {
  const utc = businessLocalToUtc(dateStr, "12:00");
  const zoned = toZonedTime(utc, BUSINESS_TIMEZONE);
  return zoned.getDay();
}

/** Upcoming date strings (YYYY-MM-DD) starting from today in business TZ */
export function upcomingBusinessDates(count: number, from = new Date()): string[] {
  const todayStr = toBusinessDateString(from);
  const base = parse(todayStr, "yyyy-MM-dd", new Date());
  return Array.from({ length: count }, (_, i) =>
    format(addDays(base, i), "yyyy-MM-dd"),
  );
}

export function startOfBusinessWeek(date: Date): Date {
  const zoned = toZonedTime(date, BUSINESS_TIMEZONE);
  const weekStart = startOfWeek(zoned, { weekStartsOn: 1 });
  const dateStr = format(startOfDay(weekStart), "yyyy-MM-dd");
  return businessLocalToUtc(dateStr, "00:00");
}

export { formatInTimeZone, fromZonedTime, toZonedTime };
