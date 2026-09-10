import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { smsHref, telHref, whatsappHref } from "@/lib/constants/shop";
import {
  formatBusinessDate,
  toBusinessTimeString,
} from "@/lib/utils/datetime";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", id)
    .maybeSingle();

  if (!client || client.role !== "customer") {
    notFound();
  }

  const { data: bookings } = await supabase
    .from("appointments")
    .select(
      "id, start_time, end_time, status, service:services(name, duration_minutes, price)",
    )
    .eq("customer_id", id)
    .order("start_time", { ascending: false });

  return (
    <div className="space-y-4">
      <Link href="/admin/clients" className="text-sm text-muted">
        ← Clienți
      </Link>
      <header>
        <h2 className="font-display text-2xl">{client.full_name}</h2>
        <p className="text-sm text-muted">{client.phone || "Fără telefon"}</p>
      </header>

      {client.phone ? (
        <div className="grid grid-cols-3 gap-2">
          <a
            href={telHref(client.phone)}
            className="rounded-xl bg-surface py-3 text-center text-sm font-medium"
          >
            Call
          </a>
          <a
            href={smsHref(client.phone)}
            className="rounded-xl bg-surface py-3 text-center text-sm font-medium"
          >
            SMS
          </a>
          <a
            href={whatsappHref(client.phone)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-surface py-3 text-center text-sm font-medium"
          >
            WhatsApp
          </a>
        </div>
      ) : null}

      <section className="space-y-3">
        <h3 className="font-display text-xl">Istoric</h3>
        {(bookings ?? []).length === 0 ? (
          <p className="text-sm text-muted">Nicio rezervare.</p>
        ) : (
          (bookings ?? []).map((booking) => {
            const service = Array.isArray(booking.service)
              ? booking.service[0]
              : booking.service;
            return (
              <article
                key={booking.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <p className="font-medium">{service?.name ?? "Serviciu"}</p>
                <p className="text-sm text-muted">
                  {formatBusinessDate(new Date(booking.start_time), "d MMM yyyy")}{" "}
                  · {toBusinessTimeString(new Date(booking.start_time))}
                </p>
                <p className="text-xs capitalize text-muted">{booking.status}</p>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
