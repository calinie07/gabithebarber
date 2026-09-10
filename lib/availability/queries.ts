import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Service, WorkingHours } from "@/lib/types/database";
import {
  computeAvailableSlots,
  parseBusyIntervals,
  toSlotLabel,
  type BusyIntervalInput,
} from "@/lib/availability/slots";
import {
  endOfBusinessDay,
  startOfBusinessDay,
  toBusinessDateString,
} from "@/lib/utils/datetime";
import type { AvailableSlot } from "@/lib/types/database";

export async function getActiveServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("duration_minutes", { ascending: true });

  if (error) {
    throw new Error("Nu am putut încărca serviciile.");
  }

  return (data ?? []) as Service[];
}

export async function getWorkingHours(): Promise<WorkingHours[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("working_hours")
    .select("*")
    .order("day_of_week", { ascending: true });

  if (error) {
    throw new Error("Nu am putut încărca programul.");
  }

  return (data ?? []) as WorkingHours[];
}

export async function getBusyIntervalsForDay(
  dateStr: string,
): Promise<BusyIntervalInput[]> {
  const supabase = await createClient();
  const from = startOfBusinessDay(dateStr).toISOString();
  const to = endOfBusinessDay(dateStr).toISOString();

  const { data, error } = await supabase.rpc("get_busy_ranges", {
    p_from: from,
    p_to: to,
  });

  if (error) {
    // Fallback for projects that haven't run the busy_ranges migration yet.
    const [{ data: appointments }, { data: blocks }] = await Promise.all([
      supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("status", "confirmed")
        .lt("start_time", to)
        .gt("end_time", from),
      supabase
        .from("blocked_times")
        .select("start_time, end_time")
        .lt("start_time", to)
        .gt("end_time", from),
    ]);

    return [
      ...((appointments ?? []) as BusyIntervalInput[]),
      ...((blocks ?? []) as BusyIntervalInput[]),
    ];
  }

  return (data ?? []) as BusyIntervalInput[];
}

export async function getAvailableSlotsForService(params: {
  serviceId: string;
  dateStr: string;
}): Promise<AvailableSlot[]> {
  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", params.serviceId)
    .eq("active", true)
    .maybeSingle();

  if (error || !service) {
    throw new Error("Serviciu invalid.");
  }

  const [workingHours, busy] = await Promise.all([
    getWorkingHours(),
    getBusyIntervalsForDay(params.dateStr),
  ]);

  const intervals = computeAvailableSlots({
    dateStr: params.dateStr,
    durationMinutes: service.duration_minutes,
    workingHours,
    busyIntervals: parseBusyIntervals(busy),
  });

  return intervals.map((interval) => ({
    start: interval.start,
    end: interval.end,
    startIso: interval.start.toISOString(),
    label: toSlotLabel(interval),
  }));
}

export function todayBusinessDate(): string {
  return toBusinessDateString(new Date());
}
