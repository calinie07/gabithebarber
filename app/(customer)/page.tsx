import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  getActiveServices,
  getWorkingHours,
} from "@/lib/availability/queries";
import { fetchAvailableSlots } from "@/lib/availability/actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { Service, WorkingHours } from "@/lib/types/database";

export default async function BookPage() {
  const profile = await getCurrentProfile();

  let services: Service[] = [];
  let workingHours: WorkingHours[] = [];
  let loadError: string | null = null;

  if (!isSupabaseConfigured()) {
    loadError =
      "Configurație lipsă: setează variabilele Supabase în Vercel (Environment Variables), apoi Redeploy.";
  } else {
    try {
      [services, workingHours] = await Promise.all([
        getActiveServices(),
        getWorkingHours(),
      ]);
    } catch (err) {
      loadError =
        err instanceof Error
          ? err.message
          : "Nu pot încărca datele din Supabase.";
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          Gabi Barber
        </p>
        <h1 className="font-display text-3xl leading-tight">Programează-te</h1>
        <p className="text-muted">
          Alege serviciul, ziua și ora — rapid, de pe telefon.
        </p>
      </header>

      {loadError ? (
        <p className="rounded-2xl border border-danger/30 bg-surface p-4 text-sm text-danger">
          {loadError}
        </p>
      ) : null}

      {!profile ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">
            Autentifică-te ca să poți confirma o rezervare.
          </p>
          <Link href="/login">
            <Button fullWidth>Autentifică-te</Button>
          </Link>
          <Link href="/register">
            <Button fullWidth variant="secondary">
              Creează cont
            </Button>
          </Link>
        </section>
      ) : (
        <p className="text-sm text-muted">
          Salut, <strong>{profile.full_name || "client"}</strong>
          {profile.role === "admin" ? " (admin)" : ""}.
        </p>
      )}

      {profile && !loadError ? (
        <BookingWizard
          services={services}
          workingHours={workingHours}
          loadSlots={fetchAvailableSlots}
        />
      ) : null}
    </div>
  );
}
