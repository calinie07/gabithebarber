"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertCustomer, AuthError } from "@/lib/auth/session";
import {
  getBusyIntervalsForDay,
  getWorkingHours,
} from "@/lib/availability/queries";
import {
  isSlotAvailable,
  parseBusyIntervals,
} from "@/lib/availability/slots";
import { addMinutesUtc, toBusinessDateString } from "@/lib/utils/datetime";

const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  startIso: z.string().min(10),
});

export type ActionResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string };

export async function createBooking(input: {
  serviceId: string;
  startIso: string;
}): Promise<ActionResult> {
  try {
    const profile = await assertCustomer();
    const parsed = createBookingSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Date de rezervare invalide." };
    }

    const supabase = await createClient();
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("*")
      .eq("id", parsed.data.serviceId)
      .eq("active", true)
      .maybeSingle();

    if (serviceError || !service) {
      return { ok: false, error: "Serviciu invalid." };
    }

    const start = new Date(parsed.data.startIso);
    if (Number.isNaN(start.getTime())) {
      return { ok: false, error: "Ora selectată este invalidă." };
    }

    const dateStr = toBusinessDateString(start);
    const [workingHours, busy] = await Promise.all([
      getWorkingHours(),
      getBusyIntervalsForDay(dateStr),
    ]);

    const available = isSlotAvailable({
      start,
      durationMinutes: service.duration_minutes,
      dateStr,
      workingHours,
      busyIntervals: parseBusyIntervals(busy),
    });

    if (!available) {
      return {
        ok: false,
        error:
          "Intervalul nu mai este disponibil. Alege altă oră.",
      };
    }

    const end = addMinutesUtc(start, service.duration_minutes);

    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        customer_id: profile.id,
        service_id: service.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "confirmed",
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23P01" || insertError.message.includes("overlap")) {
        return {
          ok: false,
          error: "Intervalul a fost rezervat între timp. Alege altă oră.",
        };
      }
      return { ok: false, error: "Nu am putut crea rezervarea. Încearcă din nou." };
    }

    return { ok: true, appointmentId: appointment.id as string };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Trebuie să fii autentificat." };
    }
    return { ok: false, error: "Eroare la rezervare." };
  }
}

export async function cancelBooking(appointmentId: string): Promise<ActionResult> {
  try {
    const profile = await assertCustomer();
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select("id, customer_id, status, start_time")
      .eq("id", appointmentId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { ok: false, error: "Rezervarea nu există." };
    }

    if (existing.customer_id !== profile.id && profile.role !== "admin") {
      return { ok: false, error: "Nu poți anula această rezervare." };
    }

    if (existing.status === "cancelled") {
      return { ok: false, error: "Rezervarea este deja anulată." };
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    if (updateError) {
      return { ok: false, error: "Nu am putut anula rezervarea." };
    }

    return { ok: true, appointmentId };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Trebuie să fii autentificat." };
    }
    return { ok: false, error: "Eroare la anulare." };
  }
}
