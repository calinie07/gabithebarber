/**
 * Business timezone helpers (Europe/Bucharest).
 *
 * Store timestamptz in Postgres; convert only at UI / slot edges.
 */

import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  addDays,
  addMinutes,
  format,
  isValid,
  parse,
  startOfDay,
  startOfWeek,
} from "date-fns";

export const BUSINESS_TIMEZONE =
  process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE ?? "Europe/Bucharest";

function assertValidDate(date: Date, context: string): Date {
  if (!isValid(date)) {
    throw new Error(`Invalid date (${context})`);
  }
  return date;
}

/** Normalize "09:00:00" / "9:00" → "09:00" */
export function normalizeClock(time: string): string {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    throw new Error(`Invalid clock time: ${time}`);
  }
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/** YYYY-MM-DD in business timezone */
export function toBusinessDateString(date: Date): string {
  return formatInTimeZone(
    assertValidDate(date, "toBusinessDateString"),
    BUSINESS_TIMEZONE,
    "yyyy-MM-dd",
  );
}

/** HH:mm in business timezone */
export function toBusinessTimeString(date: Date): string {
  return formatInTimeZone(
    assertValidDate(date, "toBusinessTimeString"),
    BUSINESS_TIMEZONE,
    "HH:mm",
  );
}

/** Human-friendly date in business TZ */
export function formatBusinessDate(date: Date, pattern = "EEE d MMM"): string {
  return formatInTimeZone(
    assertValidDate(date, "formatBusinessDate"),
    BUSINESS_TIMEZONE,
    pattern,
  );
}

export function formatBusinessDateTime(date: Date): string {
  return formatInTimeZone(
    assertValidDate(date, "formatBusinessDateTime"),
    BUSINESS_TIMEZONE,
    "EEE d MMM, HH:mm",
  );
}

/**
 * Build a UTC Date for a wall-clock time on a business calendar day.
 * Example: ("2026-09-14", "09:00") → 09:00 Europe/Bucharest that day.
 */
export function businessLocalToUtc(dateStr: string, timeStr: string): Date {
  const clock = normalizeClock(timeStr);
  const local = parse(
    `${dateStr} ${clock}`,
    "yyyy-MM-dd HH:mm",
    new Date(2000, 0, 1),
  );
  assertValidDate(local, `parse ${dateStr} ${clock}`);
  const utc = fromZonedTime(local, BUSINESS_TIMEZONE);
  return assertValidDate(utc, `fromZonedTime ${dateStr} ${clock}`);
}

export function startOfBusinessDay(dateStr: string): Date {
  return businessLocalToUtc(dateStr, "00:00");
}

export function endOfBusinessDay(dateStr: string): Date {
  const base = parse(dateStr, "yyyy-MM-dd", new Date(2000, 0, 1));
  assertValidDate(base, `endOfBusinessDay ${dateStr}`);
  const next = format(addDays(base, 1), "yyyy-MM-dd");
  return businessLocalToUtc(next, "00:00");
}

export function addMinutesUtc(date: Date, minutes: number): Date {
  return addMinutes(assertValidDate(date, "addMinutesUtc"), minutes);
}

/** Weekday 0=Sunday … 6=Saturday in business timezone */
export function businessDayOfWeek(dateStr: string): number {
  const utc = businessLocalToUtc(dateStr, "12:00");
  const zoned = toZonedTime(utc, BUSINESS_TIMEZONE);
  return assertValidDate(zoned, "businessDayOfWeek").getDay();
}

export function upcomingBusinessDates(
  count: number,
  from = new Date(),
): string[] {
  const todayStr = toBusinessDateString(from);
  const base = parse(todayStr, "yyyy-MM-dd", new Date(2000, 0, 1));
  assertValidDate(base, "upcomingBusinessDates");
  return Array.from({ length: count }, (_, i) =>
    format(addDays(base, i), "yyyy-MM-dd"),
  );
}

export function startOfBusinessWeek(date: Date): Date {
  const zoned = toZonedTime(
    assertValidDate(date, "startOfBusinessWeek"),
    BUSINESS_TIMEZONE,
  );
  const weekStart = startOfWeek(zoned, { weekStartsOn: 1 });
  const dateStr = format(startOfDay(weekStart), "yyyy-MM-dd");
  return businessLocalToUtc(dateStr, "00:00");
}

export { formatInTimeZone, fromZonedTime, toZonedTime };
