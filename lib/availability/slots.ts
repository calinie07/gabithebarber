import type { TimeInterval } from "@/lib/types/database";
import {
  addMinutesUtc,
  businessDayOfWeek,
  businessLocalToUtc,
  endOfBusinessDay,
  startOfBusinessDay,
  toBusinessTimeString,
} from "@/lib/utils/datetime";

export const SLOT_STEP_MINUTES = 15;

export interface WorkingHoursInput {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null; // "HH:mm:ss" or "HH:mm"
  close_time: string | null;
}

export interface BusyIntervalInput {
  start_time: string; // ISO
  end_time: string;
}

function normalizeTime(time: string): string {
  // Postgres time may be "09:00:00"
  return time.slice(0, 5);
}

function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function parseBusyIntervals(
  items: BusyIntervalInput[],
): TimeInterval[] {
  return items.map((item) => ({
    start: new Date(item.start_time),
    end: new Date(item.end_time),
  }));
}

/**
 * Pure availability calculator — reusable for listing slots and confirm-time checks.
 */
export function computeAvailableSlots(params: {
  dateStr: string; // YYYY-MM-DD in business TZ
  durationMinutes: number;
  workingHours: WorkingHoursInput[];
  busyIntervals: TimeInterval[];
  now?: Date;
  stepMinutes?: number;
}): TimeInterval[] {
  const {
    dateStr,
    durationMinutes,
    workingHours,
    busyIntervals,
    now = new Date(),
    stepMinutes = SLOT_STEP_MINUTES,
  } = params;

  if (durationMinutes <= 0) {
    return [];
  }

  const dow = businessDayOfWeek(dateStr);
  const hours = workingHours.find((h) => h.day_of_week === dow);

  if (!hours || hours.is_closed || !hours.open_time || !hours.close_time) {
    return [];
  }

  const open = businessLocalToUtc(dateStr, normalizeTime(hours.open_time));
  const close = businessLocalToUtc(dateStr, normalizeTime(hours.close_time));

  if (!(open < close)) {
    return [];
  }

  const dayStart = startOfBusinessDay(dateStr);
  const dayEnd = endOfBusinessDay(dateStr);

  const dayBusy = busyIntervals.filter(
    (b) => b.start < dayEnd && b.end > dayStart,
  );

  const slots: TimeInterval[] = [];
  let cursor = open;

  while (addMinutesUtc(cursor, durationMinutes) <= close) {
    const end = addMinutesUtc(cursor, durationMinutes);
    const candidate: TimeInterval = { start: cursor, end };

    const overlapsBusy = dayBusy.some((busy) =>
      intervalsOverlap(candidate, busy),
    );

    const isPast = end <= now || cursor < now;

    if (!overlapsBusy && !isPast) {
      slots.push(candidate);
    }

    cursor = addMinutesUtc(cursor, stepMinutes);
  }

  return slots;
}

export function isSlotAvailable(params: {
  start: Date;
  durationMinutes: number;
  dateStr: string;
  workingHours: WorkingHoursInput[];
  busyIntervals: TimeInterval[];
  now?: Date;
}): boolean {
  const end = addMinutesUtc(params.start, params.durationMinutes);
  const slots = computeAvailableSlots({
    dateStr: params.dateStr,
    durationMinutes: params.durationMinutes,
    workingHours: params.workingHours,
    busyIntervals: params.busyIntervals,
    now: params.now,
  });

  return slots.some(
    (slot) =>
      slot.start.getTime() === params.start.getTime() &&
      slot.end.getTime() === end.getTime(),
  );
}

export function toSlotLabel(interval: TimeInterval): string {
  return toBusinessTimeString(interval.start);
}

export function bookableWeekdayDates(params: {
  dateStrings: string[];
  workingHours: WorkingHoursInput[];
}): string[] {
  return params.dateStrings.filter((dateStr) => {
    const dow = businessDayOfWeek(dateStr);
    const hours = params.workingHours.find((h) => h.day_of_week === dow);
    return Boolean(hours && !hours.is_closed && hours.open_time && hours.close_time);
  });
}
