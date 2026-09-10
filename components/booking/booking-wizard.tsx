"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBooking } from "@/lib/bookings/actions";
import { bookableWeekdayDates } from "@/lib/availability/slots";
import type { Service, WorkingHours } from "@/lib/types/database";
import { cn, formatPriceRon } from "@/lib/utils/cn";
import {
  businessLocalToUtc,
  formatBusinessDate,
  upcomingBusinessDates,
} from "@/lib/utils/datetime";
import type { SlotDto } from "@/lib/availability/actions";

type Step = "service" | "day" | "time" | "review" | "done";

function DayChip({
  dateStr,
  selected,
  onSelect,
}: {
  dateStr: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = formatBusinessDate(
    businessLocalToUtc(dateStr, "12:00"),
    "EEE d",
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "min-h-16 min-w-[4.5rem] shrink-0 rounded-2xl border px-3 py-2 text-center text-sm font-medium capitalize",
        selected
          ? "border-accent bg-accent text-white"
          : "border-border bg-surface text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function BookingWizard({
  services,
  workingHours,
  loadSlots,
}: {
  services: Service[];
  workingHours: WorkingHours[];
  loadSlots: (serviceId: string, dateStr: string) => Promise<SlotDto[]>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotDto | null>(null);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const service = services.find((s) => s.id === serviceId) ?? null;

  const dates = useMemo(() => {
    const upcoming = upcomingBusinessDates(21);
    return bookableWeekdayDates({ dateStrings: upcoming, workingHours });
  }, [workingHours]);

  async function selectService(id: string) {
    setServiceId(id);
    setDateStr(null);
    setSlot(null);
    setSlots([]);
    setError(null);
    setStep("day");
  }

  async function selectDay(nextDate: string) {
    if (!serviceId) return;
    setDateStr(nextDate);
    setSlot(null);
    setError(null);
    setSlotsLoading(true);
    setStep("time");
    try {
      const nextSlots = await loadSlots(serviceId, nextDate);
      setSlots(nextSlots);
    } catch {
      setSlots([]);
      setError("Nu am putut încărca orele disponibile.");
    } finally {
      setSlotsLoading(false);
    }
  }

  function selectSlot(next: SlotDto) {
    setSlot(next);
    setError(null);
    setStep("review");
  }

  function confirm() {
    if (!serviceId || !slot) return;
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        serviceId,
        startIso: slot.startIso,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStep("done");
      router.refresh();
    });
  }

  if (step === "done" && service && slot) {
    return (
      <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm font-medium text-success">Rezervare confirmată</p>
        <h2 className="font-display text-2xl">{service.name}</h2>
        <p className="text-muted">
          {formatBusinessDate(new Date(slot.startIso), "EEEE d MMMM")} ·{" "}
          {slot.label}
        </p>
        <p className="text-sm text-muted">
          {service.duration_minutes} min · {formatPriceRon(Number(service.price))}
        </p>
        <Button fullWidth onClick={() => router.push("/bookings")}>
          Vezi rezervările mele
        </Button>
        <Button
          fullWidth
          variant="secondary"
          onClick={() => {
            setStep("service");
            setServiceId(null);
            setDateStr(null);
            setSlot(null);
            setSlots([]);
          }}
        >
          Altă rezervare
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {step !== "service" ? (
        <button
          type="button"
          className="text-sm font-medium text-muted"
          onClick={() => {
            setError(null);
            if (step === "review") setStep("time");
            else if (step === "time") setStep("day");
            else if (step === "day") setStep("service");
          }}
        >
          ← Înapoi
        </button>
      ) : null}

      {step === "service" ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl">1. Alege serviciul</h2>
          <ul className="space-y-3">
            {services.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectService(item.id)}
                  className="flex w-full min-h-16 flex-col gap-1 rounded-2xl border border-border bg-surface px-4 py-4 text-left active:scale-[0.99]"
                >
                  <span className="text-lg font-medium">{item.name}</span>
                  <span className="text-sm text-muted">
                    {item.duration_minutes} min ·{" "}
                    {formatPriceRon(Number(item.price))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {services.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              Nu există servicii active. Rulează migrarea SQL în Supabase.
            </p>
          ) : null}
        </section>
      ) : null}

      {step === "day" ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl">2. Alege ziua</h2>
          <p className="text-sm text-muted">{service?.name}</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {dates.map((d) => (
              <DayChip
                key={d}
                dateStr={d}
                selected={dateStr === d}
                onSelect={() => selectDay(d)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {step === "time" ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl">3. Alege ora</h2>
          <p className="text-sm text-muted">
            {service?.name}
            {dateStr
              ? ` · ${formatBusinessDate(businessLocalToUtc(dateStr, "12:00"), "EEEE d MMM")}`
              : ""}
          </p>
          {slotsLoading ? (
            <p className="text-sm text-muted">Se încarcă orele…</p>
          ) : slots.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
              Nicio oră disponibilă în această zi.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((item) => (
                <button
                  key={item.startIso}
                  type="button"
                  onClick={() => selectSlot(item)}
                  className="min-h-14 rounded-2xl border border-border bg-surface text-base font-medium"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {step === "review" && service && slot && dateStr ? (
        <section className="space-y-4">
          <h2 className="font-display text-xl">4. Confirmă</h2>
          <div className="space-y-2 rounded-2xl border border-border bg-surface p-5">
            <p className="text-lg font-medium">{service.name}</p>
            <p className="text-muted">
              {formatBusinessDate(
                businessLocalToUtc(dateStr, "12:00"),
                "EEEE d MMMM",
              )}
            </p>
            <p className="text-muted">
              {slot.label} · {service.duration_minutes} min
            </p>
            <p className="font-medium">
              {formatPriceRon(Number(service.price))}
            </p>
          </div>
          <Button fullWidth disabled={pending} onClick={confirm}>
            {pending ? "Se confirmă…" : "Confirmă rezervarea"}
          </Button>
        </section>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
