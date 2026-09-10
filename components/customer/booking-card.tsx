"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/bookings/actions";
import { formatPriceRon } from "@/lib/utils/cn";
import {
  formatBusinessDate,
  toBusinessTimeString,
} from "@/lib/utils/datetime";

export type BookingCardData = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  service: {
    name: string;
    duration_minutes: number;
    price: number;
  } | null;
};

export function BookingCard({
  booking,
  canCancel,
}: {
  booking: BookingCardData;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const start = new Date(booking.start_time);

  return (
    <article className="space-y-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {booking.service?.name ?? "Serviciu"}
          </p>
          <p className="text-sm text-muted capitalize">
            {formatBusinessDate(start, "EEEE d MMM")} ·{" "}
            {toBusinessTimeString(start)}
          </p>
        </div>
        <span className="rounded-full bg-background px-2 py-1 text-xs capitalize text-muted">
          {booking.status === "confirmed" ? "confirmată" : "anulată"}
        </span>
      </div>
      <p className="text-sm text-muted">
        {booking.service?.duration_minutes ?? "—"} min ·{" "}
        {formatPriceRon(Number(booking.service?.price ?? 0))}
      </p>
      {canCancel && booking.status === "confirmed" ? (
        <Button
          variant="secondary"
          className="min-h-11 w-full"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await cancelBooking(booking.id);
              router.refresh();
            });
          }}
        >
          {pending ? "Se anulează…" : "Anulează"}
        </Button>
      ) : null}
    </article>
  );
}
