"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin, assertCustomer, AuthError } from "@/lib/auth/session";
import {
  getBusyIntervalsForDay,
  getWorkingHours,
} from "@/lib/availability/queries";
import {
  isSlotAvailable,
  parseBusyIntervals,
} from "@/lib/availability/slots";
import { addMinutesUtc, toBusinessDateString } from "@/lib/utils/datetime";
import { normalizePhone } from "@/lib/utils/phone";
import type { Customer } from "@/lib/types/database";

export type ActionResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string };

export type CustomerResult =
  | { ok: true; customer: Customer }
  | { ok: false; error: string };

async function ensureCustomerForAuthUser(): Promise<
  { ok: true; customerId: string } | { ok: false; error: string }
> {
  const profile = await assertCustomer();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_user_id", profile.id)
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, customerId: existing.id as string };
  }

  // Legacy: customer row may still use profile id
  const { data: byId } = await supabase
    .from("customers")
    .select("id")
    .eq("id", profile.id)
    .maybeSingle();

  if (byId?.id) {
    await supabase
      .from("customers")
      .update({ auth_user_id: profile.id })
      .eq("id", byId.id);
    return { ok: true, customerId: byId.id as string };
  }

  const phone =
    normalizePhone(profile.phone ?? "") ??
    `+40temp-${profile.id.replace(/-/g, "")}`;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      id: profile.id,
      full_name: profile.full_name || "Client",
      phone,
      auth_user_id: profile.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    // Phone taken — link auth to that customer if possible
    const { data: byPhone } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (byPhone?.id) {
      await supabase
        .from("customers")
        .update({ auth_user_id: profile.id })
        .eq("id", byPhone.id);
      return { ok: true, customerId: byPhone.id as string };
    }

    return { ok: false, error: "Nu am putut lega contul de client." };
  }

  return { ok: true, customerId: created.id as string };
}

const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  startIso: z.string().min(10),
});

async function validateAndCreateAppointment(params: {
  customerId: string;
  serviceId: string;
  startIso: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", params.serviceId)
    .eq("active", true)
    .maybeSingle();

  if (serviceError || !service) {
    return { ok: false, error: "Serviciu invalid." };
  }

  const start = new Date(params.startIso);
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
      error: "Intervalul nu mai este disponibil. Alege altă oră.",
    };
  }

  const end = addMinutesUtc(start, service.duration_minutes);

  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      customer_id: params.customerId,
      service_id: service.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "confirmed",
    })
    .select("id")
    .single();

  if (insertError) {
    if (
      insertError.code === "23P01" ||
      insertError.message.includes("overlap")
    ) {
      return {
        ok: false,
        error: "Intervalul a fost rezervat între timp. Alege altă oră.",
      };
    }
    return {
      ok: false,
      error: "Nu am putut crea rezervarea. Încearcă din nou.",
    };
  }

  return { ok: true, appointmentId: appointment.id as string };
}

export async function createBooking(input: {
  serviceId: string;
  startIso: string;
}): Promise<ActionResult> {
  try {
    const parsed = createBookingSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Date de rezervare invalide." };
    }

    const customer = await ensureCustomerForAuthUser();
    if (!customer.ok) return customer;

    return validateAndCreateAppointment({
      customerId: customer.customerId,
      serviceId: parsed.data.serviceId,
      startIso: parsed.data.startIso,
    });
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

    const linked = await ensureCustomerForAuthUser();
    if (!linked.ok) return linked;

    const { data: existing, error: fetchError } = await supabase
      .from("appointments")
      .select("id, customer_id, status")
      .eq("id", appointmentId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { ok: false, error: "Rezervarea nu există." };
    }

    if (
      existing.customer_id !== linked.customerId &&
      profile.role !== "admin"
    ) {
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

export async function searchCustomers(query: string): Promise<Customer[]> {
  await assertAdmin();
  const supabase = await createClient();
  const q = query.trim();

  if (!q) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("full_name", { ascending: true })
      .limit(30);
    return (data ?? []) as Customer[];
  }

  const phone = normalizePhone(q);
  let builder = supabase.from("customers").select("*").limit(30);

  if (phone) {
    builder = builder.or(
      `phone.ilike.%${phone}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  } else {
    builder = builder.ilike("full_name", `%${q}%`);
  }

  const { data } = await builder.order("full_name", { ascending: true });
  return (data ?? []) as Customer[];
}

export async function createCustomer(input: {
  fullName: string;
  phone: string;
}): Promise<CustomerResult> {
  try {
    await assertAdmin();
    const fullName = input.fullName.trim();
    const phone = normalizePhone(input.phone);

    if (!fullName) {
      return { ok: false, error: "Numele este obligatoriu." };
    }
    if (!phone) {
      return { ok: false, error: "Număr de telefon invalid." };
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      return { ok: true, customer: existing as Customer };
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        full_name: fullName,
        phone,
      })
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: "Nu am putut crea clientul (telefon folosit?)." };
    }

    return { ok: true, customer: data as Customer };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Acces admin necesar." };
    }
    return { ok: false, error: "Eroare la crearea clientului." };
  }
}

export async function adminCreateBooking(input: {
  customerId: string;
  serviceId: string;
  startIso: string;
}): Promise<ActionResult> {
  try {
    await assertAdmin();
    const parsed = createBookingSchema
      .extend({ customerId: z.string().uuid() })
      .safeParse(input);

    if (!parsed.success) {
      return { ok: false, error: "Date de rezervare invalide." };
    }

    return validateAndCreateAppointment({
      customerId: parsed.data.customerId,
      serviceId: parsed.data.serviceId,
      startIso: parsed.data.startIso,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Acces admin necesar." };
    }
    return { ok: false, error: "Eroare la rezervare." };
  }
}
