/**
 * Business timezone helpers (Europe/Bucharest).
 * Uses Intl only — avoids date-fns / date-fns-tz runtime mismatches on Vercel.
 */

const DEFAULT_TIMEZONE = "Europe/Bucharest";

function sanitizeTimeZone(raw: string | undefined): string {
  if (!raw) return DEFAULT_TIMEZONE;
  // Strip quotes/spaces people often paste into Vercel env UI
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  return cleaned || DEFAULT_TIMEZONE;
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function resolveBusinessTimezone(): string {
  const candidates = [
    sanitizeTimeZone(process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE),
    DEFAULT_TIMEZONE,
    "Europe/Athens",
    "UTC",
  ];
  for (const tz of candidates) {
    if (isValidTimeZone(tz)) return tz;
  }
  return "UTC";
}

export const BUSINESS_TIMEZONE = resolveBusinessTimezone();

function assertValid(date: Date, context: string): Date {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date (${context})`);
  }
  return date;
}

/** Normalize "09:00:00" / "9:00" → "09:00" */
export function normalizeClock(time: string): string {
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    throw new Error(`Invalid clock time: ${time}`);
  }
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function partsInZone(date: Date, timeZone: string = BUSINESS_TIMEZONE) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return map;
}

/** YYYY-MM-DD in business timezone */
export function toBusinessDateString(date: Date): string {
  const p = partsInZone(assertValid(date, "toBusinessDateString"), BUSINESS_TIMEZONE);
  return `${p.year}-${p.month}-${p.day}`;
}

/** HH:mm in business timezone */
export function toBusinessTimeString(date: Date): string {
  const p = partsInZone(assertValid(date, "toBusinessTimeString"), BUSINESS_TIMEZONE);
  return `${p.hour}:${p.minute}`;
}

export function formatBusinessDate(date: Date, pattern = "EEE d MMM"): string {
  assertValid(date, "formatBusinessDate");
  // Simple pattern subset used by the app
  if (pattern === "EEE d") {
    return new Intl.DateTimeFormat("ro-RO", {
      timeZone: BUSINESS_TIMEZONE,
      weekday: "short",
      day: "numeric",
    }).format(date);
  }
  if (pattern === "EEEE d MMM" || pattern === "EEEE d MMMM") {
    return new Intl.DateTimeFormat("ro-RO", {
      timeZone: BUSINESS_TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: pattern.endsWith("MMMM") ? "long" : "short",
    }).format(date);
  }
  if (pattern === "d MMM yyyy") {
    return new Intl.DateTimeFormat("ro-RO", {
      timeZone: BUSINESS_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }
  if (pattern === "d MMM") {
    return new Intl.DateTimeFormat("ro-RO", {
      timeZone: BUSINESS_TIMEZONE,
      day: "numeric",
      month: "short",
    }).format(date);
  }
  if (pattern === "EEE d MMM") {
    return new Intl.DateTimeFormat("ro-RO", {
      timeZone: BUSINESS_TIMEZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date);
  }
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatBusinessDateTime(date: Date): string {
  assertValid(date, "formatBusinessDateTime");
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/**
 * UTC instant for a wall-clock time on a calendar day in BUSINESS_TIMEZONE.
 */
export function businessLocalToUtc(dateStr: string, timeStr: string): Date {
  const clock = normalizeClock(timeStr);
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = clock.split(":").map(Number);

  // Guess UTC by treating the wall time as UTC, then correct by zone offset.
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const p = partsInZone(guess, BUSINESS_TIMEZONE);
  const asZone = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  const desired = Date.UTC(y, m - 1, d, hh, mm, 0);
  const utc = new Date(guess.getTime() + (desired - asZone));
  return assertValid(utc, `businessLocalToUtc ${dateStr} ${clock}`);
}

export function startOfBusinessDay(dateStr: string): Date {
  return businessLocalToUtc(dateStr, "00:00");
}

export function endOfBusinessDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextStr = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return businessLocalToUtc(nextStr, "00:00");
}

export function addMinutesUtc(date: Date, minutes: number): Date {
  return new Date(assertValid(date, "addMinutesUtc").getTime() + minutes * 60_000);
}

/** Weekday 0=Sunday … 6=Saturday in business timezone */
export function businessDayOfWeek(dateStr: string): number {
  const utc = businessLocalToUtc(dateStr, "12:00");
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
  }).format(utc);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? utc.getUTCDay();
}

export function upcomingBusinessDates(
  count: number,
  from = new Date(),
): string[] {
  const todayStr = toBusinessDateString(from);
  const [y, m, d] = todayStr.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    out.push(
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return out;
}

export function startOfBusinessWeek(date: Date): Date {
  const dateStr = toBusinessDateString(date);
  const dow = businessDayOfWeek(dateStr); // 0 Sun … 6 Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const [y, m, d] = dateStr.split("-").map(Number);
  const monday = new Date(Date.UTC(y, m - 1, d + mondayOffset));
  const mondayStr = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
  return businessLocalToUtc(mondayStr, "00:00");
}
