"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin, AuthError } from "@/lib/auth/session";
import { businessLocalToUtc } from "@/lib/utils/datetime";

export type AdminActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const blockSchema = z.object({
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(120).optional(),
});

export async function createBlockedTime(input: {
  dateStr: string;
  startTime: string;
  endTime: string;
  reason?: string;
}): Promise<AdminActionResult> {
  try {
    await assertAdmin();
    const parsed = blockSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Date invalide pentru pauză." };
    }

    const start = businessLocalToUtc(parsed.data.dateStr, parsed.data.startTime);
    const end = businessLocalToUtc(parsed.data.dateStr, parsed.data.endTime);

    if (!(start < end)) {
      return { ok: false, error: "Ora de sfârșit trebuie să fie după ora de început." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blocked_times")
      .insert({
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        reason: parsed.data.reason?.trim() || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: "Nu am putut salva pauza." };
    }

    return { ok: true, id: data.id as string };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Acces admin necesar." };
    }
    return { ok: false, error: "Eroare la salvare." };
  }
}

export async function deleteBlockedTime(id: string): Promise<AdminActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase.from("blocked_times").delete().eq("id", id);

    if (error) {
      return { ok: false, error: "Nu am putut șterge pauza." };
    }

    return { ok: true, id };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Acces admin necesar." };
    }
    return { ok: false, error: "Eroare la ștergere." };
  }
}

export async function adminCancelAppointment(
  appointmentId: string,
): Promise<AdminActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId)
      .eq("status", "confirmed");

    if (error) {
      return { ok: false, error: "Nu am putut anula programarea." };
    }

    return { ok: true, id: appointmentId };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Acces admin necesar." };
    }
    return { ok: false, error: "Eroare la anulare." };
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<AdminActionResult> {
  try {
    await assertAdmin();
    const supabase = await createClient();
    const { error } = await supabase
      .from("admin_notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) {
      return { ok: false, error: "Nu am putut marca notificarea." };
    }

    return { ok: true, id: notificationId };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Acces admin necesar." };
    }
    return { ok: false, error: "Eroare." };
  }
}
