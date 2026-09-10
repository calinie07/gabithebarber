import {
  AdminCalendarClient,
  type AdminAppointment,
  type AdminBlock,
} from "@/components/admin/admin-calendar";
import { createClient } from "@/lib/supabase/server";
import { toBusinessDateString } from "@/lib/utils/datetime";

export default async function AdminCalendarPage() {
  const supabase = await createClient();
  const today = toBusinessDateString(new Date());

  const [{ data: appointments }, { data: blocks }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, start_time, end_time, status, service:services(name), customer:profiles!appointments_customer_id_fkey(full_name, phone)",
      )
      .order("start_time", { ascending: true }),
    supabase
      .from("blocked_times")
      .select("id, start_time, end_time, reason")
      .order("start_time", { ascending: true }),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl">Calendar</h2>
        <p className="text-sm text-muted">
          Programări și pauze — vedere pe zi (ideal pe telefon).
        </p>
      </header>
      <AdminCalendarClient
        initialDate={today}
        appointments={(appointments ?? []) as unknown as AdminAppointment[]}
        blocks={(blocks ?? []) as unknown as AdminBlock[]}
      />
    </div>
  );
}
