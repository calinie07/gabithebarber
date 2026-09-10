"use client";

import { useMemo, useState, useTransition } from "react";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminCancelAppointment,
  createBlockedTime,
  deleteBlockedTime,
} from "@/lib/admin/actions";
import { smsHref, telHref, whatsappHref } from "@/lib/constants/shop";
import { cn } from "@/lib/utils/cn";
import {
  businessLocalToUtc,
  formatBusinessDate,
  toBusinessDateString,
  toBusinessTimeString,
} from "@/lib/utils/datetime";

export type AdminAppointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  service: { name: string } | null;
  customer: { full_name: string; phone: string | null } | null;
};

export type AdminBlock = {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
};

export function AdminCalendarClient({
  initialDate,
  appointments,
  blocks,
}: {
  initialDate: string;
  appointments: AdminAppointment[];
  blocks: AdminBlock[];
}) {
  const [dateStr, setDateStr] = useState(initialDate);
  const [selected, setSelected] = useState<AdminAppointment | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockStart, setBlockStart] = useState("13:00");
  const [blockEnd, setBlockEnd] = useState("14:00");
  const [blockReason, setBlockReason] = useState("Pauză");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => toBusinessDateString(new Date(a.start_time)) === dateStr)
        .filter((a) => a.status === "confirmed")
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments, dateStr],
  );

  const dayBlocks = useMemo(
    () =>
      blocks
        .filter((b) => toBusinessDateString(new Date(b.start_time)) === dateStr)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [blocks, dateStr],
  );

  const weekDates = useMemo(() => {
    const base = businessLocalToUtc(dateStr, "12:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(base, i - 3);
      return toBusinessDateString(d);
    });
  }, [dateStr]);

  function shiftDay(delta: number) {
    const next = format(
      addDays(businessLocalToUtc(dateStr, "12:00"), delta),
      "yyyy-MM-dd",
    );
    setDateStr(next);
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          className="min-h-11 px-3"
          onClick={() => shiftDay(-1)}
        >
          ←
        </Button>
        <p className="text-center font-display text-xl capitalize">
          {formatBusinessDate(
            businessLocalToUtc(dateStr, "12:00"),
            "EEEE d MMMM",
          )}
        </p>
        <Button
          variant="secondary"
          className="min-h-11 px-3"
          onClick={() => shiftDay(1)}
        >
          →
        </Button>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {weekDates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDateStr(d)}
            className={cn(
              "min-h-14 min-w-[4.25rem] shrink-0 rounded-2xl border px-2 text-sm capitalize",
              d === dateStr
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface",
            )}
          >
            {formatBusinessDate(businessLocalToUtc(d, "12:00"), "EEE d")}
          </button>
        ))}
      </div>

      <Button
        variant="secondary"
        className="min-h-11 w-full"
        onClick={() => setShowBlockForm((v) => !v)}
      >
        {showBlockForm ? "Închide formularul" : "Adaugă pauză / blocare"}
      </Button>

      {showBlockForm ? (
        <form
          className="space-y-3 rounded-2xl border border-border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await createBlockedTime({
                dateStr,
                startTime: blockStart,
                endTime: blockEnd,
                reason: blockReason,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setShowBlockForm(false);
              window.location.reload();
            });
          }}
        >
          <Input
            label="Început"
            type="time"
            value={blockStart}
            onChange={(e) => setBlockStart(e.target.value)}
            required
          />
          <Input
            label="Sfârșit"
            type="time"
            value={blockEnd}
            onChange={(e) => setBlockEnd(e.target.value)}
            required
          />
          <Input
            label="Motiv (opțional)"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
          <Button type="submit" fullWidth disabled={pending}>
            Salvează pauza
          </Button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="space-y-2">
        {dayBlocks.map((block) => (
          <div
            key={block.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-[#efe8df] px-4 py-3"
          >
            <div>
              <p className="font-medium">
                {toBusinessTimeString(new Date(block.start_time))} –{" "}
                {toBusinessTimeString(new Date(block.end_time))}
              </p>
              <p className="text-sm text-muted">{block.reason || "Blocat"}</p>
            </div>
            <Button
              variant="ghost"
              className="min-h-10 text-danger"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await deleteBlockedTime(block.id);
                  window.location.reload();
                });
              }}
            >
              Șterge
            </Button>
          </div>
        ))}

        {dayAppointments.length === 0 && dayBlocks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            Nicio programare în această zi.
          </p>
        ) : null}

        {dayAppointments.map((appt) => (
          <button
            key={appt.id}
            type="button"
            onClick={() => setSelected(appt)}
            className="w-full rounded-2xl border border-border bg-accent px-4 py-3 text-left text-white"
          >
            <p className="font-medium">
              {toBusinessTimeString(new Date(appt.start_time))} –{" "}
              {toBusinessTimeString(new Date(appt.end_time))}
            </p>
            <p className="text-sm text-white/85">
              {appt.customer?.full_name ?? "Client"}
            </p>
            <p className="text-sm text-white/75">
              {appt.service?.name ?? "Serviciu"}
            </p>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl">
                  {selected.customer?.full_name ?? "Client"}
                </h3>
                <p className="text-sm text-muted">{selected.service?.name}</p>
              </div>
              <button
                type="button"
                className="text-sm text-muted"
                onClick={() => setSelected(null)}
              >
                Închide
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <p>
                {formatBusinessDate(
                  new Date(selected.start_time),
                  "EEEE d MMMM",
                )}
              </p>
              <p>
                {toBusinessTimeString(new Date(selected.start_time))} –{" "}
                {toBusinessTimeString(new Date(selected.end_time))}
              </p>
              <p className="capitalize text-muted">{selected.status}</p>
            </div>

            {selected.customer?.phone ? (
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={telHref(selected.customer.phone)}
                  className="rounded-xl bg-background py-3 text-center text-sm font-medium"
                >
                  Call
                </a>
                <a
                  href={smsHref(selected.customer.phone)}
                  className="rounded-xl bg-background py-3 text-center text-sm font-medium"
                >
                  SMS
                </a>
                <a
                  href={whatsappHref(selected.customer.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-background py-3 text-center text-sm font-medium"
                >
                  WhatsApp
                </a>
              </div>
            ) : null}

            <Button
              variant="danger"
              fullWidth
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await adminCancelAppointment(selected.id);
                  setSelected(null);
                  window.location.reload();
                });
              }}
            >
              Anulează programarea
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
