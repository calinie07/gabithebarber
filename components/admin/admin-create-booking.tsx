"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminCreateBooking,
  createCustomer,
  searchCustomers,
} from "@/lib/bookings/actions";
import { fetchAvailableSlots, type SlotDto } from "@/lib/availability/actions";
import { bookableWeekdayDates } from "@/lib/availability/slots";
import type { Customer, Service, WorkingHours } from "@/lib/types/database";
import { cn, formatPriceRon } from "@/lib/utils/cn";
import {
  businessLocalToUtc,
  formatBusinessDate,
  upcomingBusinessDates,
} from "@/lib/utils/datetime";
import { formatPhoneDisplay } from "@/lib/utils/phone";

type Step = "client" | "service" | "day" | "time" | "review";

export function AdminCreateBookingButton({
  services,
  workingHours,
}: {
  services: Service[];
  workingHours: WorkingHours[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("client");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
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

  useEffect(() => {
    if (!open || mode !== "existing") return;
    const handle = setTimeout(() => {
      void searchCustomers(query).then(setResults);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open, mode]);

  function reset() {
    setStep("client");
    setMode("existing");
    setQuery("");
    setResults([]);
    setCustomer(null);
    setNewName("");
    setNewPhone("");
    setServiceId(null);
    setDateStr(null);
    setSlot(null);
    setSlots([]);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function selectDay(nextDate: string) {
    if (!serviceId) return;
    setDateStr(nextDate);
    setSlot(null);
    setSlotsLoading(true);
    setStep("time");
    setError(null);
    try {
      setSlots(await fetchAvailableSlots(serviceId, nextDate));
    } catch {
      setSlots([]);
      setError("Nu am putut încărca orele.");
    } finally {
      setSlotsLoading(false);
    }
  }

  function confirm() {
    if (!customer || !serviceId || !slot) return;
    setError(null);
    startTransition(async () => {
      const result = await adminCreateBooking({
        customerId: customer.id,
        serviceId,
        startIso: slot.startIso,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Rezervare nouă"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg"
      >
        <Plus className="h-7 w-7" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Rezervare nouă</h2>
                <p className="text-sm text-muted">Pentru programări pe telefon</p>
              </div>
              <button type="button" className="text-sm text-muted" onClick={close}>
                Închide
              </button>
            </div>

            {step === "client" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={mode === "existing" ? "primary" : "secondary"}
                    onClick={() => setMode("existing")}
                  >
                    Client existent
                  </Button>
                  <Button
                    variant={mode === "new" ? "primary" : "secondary"}
                    onClick={() => setMode("new")}
                  >
                    Client nou
                  </Button>
                </div>

                {mode === "existing" ? (
                  <div className="space-y-3">
                    <Input
                      label="Caută după telefon sau nume"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="07… sau nume"
                    />
                    <ul className="max-h-64 space-y-2 overflow-y-auto">
                      {results.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="w-full rounded-2xl border border-border px-4 py-3 text-left"
                            onClick={() => {
                              setCustomer(item);
                              setStep("service");
                            }}
                          >
                            <p className="font-medium">{item.full_name}</p>
                            <p className="text-sm text-muted">
                              {formatPhoneDisplay(item.phone)}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      label="Nume"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                    <Input
                      label="Telefon"
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="07…"
                      required
                    />
                    <Button
                      fullWidth
                      disabled={pending}
                      onClick={() => {
                        setError(null);
                        startTransition(async () => {
                          const result = await createCustomer({
                            fullName: newName,
                            phone: newPhone,
                          });
                          if (!result.ok) {
                            setError(result.error);
                            return;
                          }
                          setCustomer(result.customer);
                          setStep("service");
                        });
                      }}
                    >
                      Continuă
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {step === "service" && customer ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  {customer.full_name} · {formatPhoneDisplay(customer.phone)}
                </p>
                <button
                  type="button"
                  className="text-sm text-muted"
                  onClick={() => setStep("client")}
                >
                  ← Schimbă clientul
                </button>
                <ul className="space-y-2">
                  {services.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full rounded-2xl border border-border px-4 py-3 text-left"
                        onClick={() => {
                          setServiceId(item.id);
                          setStep("day");
                        }}
                      >
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted">
                          {item.duration_minutes} min ·{" "}
                          {formatPriceRon(Number(item.price))}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {step === "day" ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className="text-sm text-muted"
                  onClick={() => setStep("service")}
                >
                  ← Înapoi
                </button>
                <p className="font-medium">{service?.name}</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {dates.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => void selectDay(d)}
                      className={cn(
                        "min-h-14 min-w-[4.25rem] shrink-0 rounded-2xl border px-2 text-sm capitalize",
                        dateStr === d
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-background",
                      )}
                    >
                      {formatBusinessDate(
                        businessLocalToUtc(d, "12:00"),
                        "EEE d",
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === "time" ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className="text-sm text-muted"
                  onClick={() => setStep("day")}
                >
                  ← Înapoi
                </button>
                {slotsLoading ? (
                  <p className="text-sm text-muted">Se încarcă…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted">Nicio oră disponibilă.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((item) => (
                      <button
                        key={item.startIso}
                        type="button"
                        className="min-h-12 rounded-2xl border border-border bg-background font-medium"
                        onClick={() => {
                          setSlot(item);
                          setStep("review");
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {step === "review" && customer && service && slot && dateStr ? (
              <div className="space-y-4">
                <button
                  type="button"
                  className="text-sm text-muted"
                  onClick={() => setStep("time")}
                >
                  ← Înapoi
                </button>
                <div className="space-y-1 rounded-2xl border border-border bg-background p-4">
                  <p className="font-medium">{customer.full_name}</p>
                  <p className="text-sm text-muted">
                    {formatPhoneDisplay(customer.phone)}
                  </p>
                  <p className="pt-2 font-medium">{service.name}</p>
                  <p className="text-sm text-muted">
                    {formatBusinessDate(
                      businessLocalToUtc(dateStr, "12:00"),
                      "EEEE d MMMM",
                    )}{" "}
                    · {slot.label}
                  </p>
                </div>
                <Button fullWidth disabled={pending} onClick={confirm}>
                  {pending ? "Se salvează…" : "Confirmă rezervarea"}
                </Button>
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
