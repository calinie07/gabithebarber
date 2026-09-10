import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  BookingCard,
  type BookingCardData,
} from "@/components/customer/booking-card";

export default async function BookingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, start_time, end_time, status, service:services(name, duration_minutes, price)",
    )
    .eq("customer_id", profile.id)
    .order("start_time", { ascending: false });

  const bookings = (data ?? []) as unknown as BookingCardData[];
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && b.start_time >= nowIso,
  );
  const previous = bookings.filter(
    (b) => !(b.status === "confirmed" && b.start_time >= nowIso),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Rezervările mele</h1>
        <p className="mt-2 text-muted">Viitoare și recente.</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Viitoare</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            Nicio rezervare viitoare.
          </p>
        ) : (
          upcoming
            .slice()
            .reverse()
            .map((booking) => (
              <BookingCard key={booking.id} booking={booking} canCancel />
            ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Anterioare</h2>
        {previous.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            Nicio rezervare anterioară.
          </p>
        ) : (
          previous.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              canCancel={false}
            />
          ))
        )}
      </section>
    </div>
  );
}
