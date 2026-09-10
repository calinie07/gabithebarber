"use server";

import { getAvailableSlotsForService } from "@/lib/availability/queries";
import type { SlotDto } from "@/lib/types/slots";

export type { SlotDto };

export async function fetchAvailableSlots(
  serviceId: string,
  dateStr: string,
): Promise<SlotDto[]> {
  const slots = await getAvailableSlotsForService({ serviceId, dateStr });
  return slots.map((slot) => ({
    startIso: slot.startIso,
    endIso: slot.end.toISOString(),
    label: slot.label,
  }));
}
