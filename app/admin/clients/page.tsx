import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { smsHref, telHref, whatsappHref } from "@/lib/constants/shop";
import {
  formatBusinessDate,
  toBusinessTimeString,
} from "@/lib/utils/datetime";

type ClientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  booking_count: number;
  last_booking: string | null;
};

export default async function AdminClientsPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("role", "customer")
    .order("full_name", { ascending: true });

  const { data: appointments } = await supabase
    .from("appointments")
    .select("customer_id, start_time, status")
    .order("start_time", { ascending: false });

  const rows: ClientRow[] = (profiles ?? []).map((profile) => {
    const own = (appointments ?? []).filter((a) => a.customer_id === profile.id);
    return {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      booking_count: own.length,
      last_booking: own[0]?.start_time ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl">Clienți</h2>
        <p className="text-sm text-muted">{rows.length} clienți înregistrați</p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center text-sm text-muted">
          Niciun client încă.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((client) => (
            <li
              key={client.id}
              className="space-y-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div>
                <p className="text-lg font-medium">{client.full_name}</p>
                <p className="text-sm text-muted">
                  {client.booking_count} rezervări
                  {client.last_booking
                    ? ` · ultima ${formatBusinessDate(new Date(client.last_booking), "d MMM")} ${toBusinessTimeString(new Date(client.last_booking))}`
                    : ""}
                </p>
              </div>
              {client.phone ? (
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={telHref(client.phone)}
                    className="rounded-xl bg-background py-3 text-center text-sm font-medium"
                  >
                    Call
                  </a>
                  <a
                    href={smsHref(client.phone)}
                    className="rounded-xl bg-background py-3 text-center text-sm font-medium"
                  >
                    SMS
                  </a>
                  <a
                    href={whatsappHref(client.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-background py-3 text-center text-sm font-medium"
                  >
                    WhatsApp
                  </a>
                </div>
              ) : null}
              <Link
                href={`/admin/clients/${client.id}`}
                className="block text-sm font-medium underline"
              >
                Vezi istoric
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
