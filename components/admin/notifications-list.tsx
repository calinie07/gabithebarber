"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markNotificationRead } from "@/lib/admin/actions";
import { formatBusinessDateTime } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/cn";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function NotificationsList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-surface px-4 py-16 text-center text-sm text-muted">
        Nicio activitate încă.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            "space-y-2 rounded-2xl border border-border bg-surface p-4",
            !item.read && "border-accent/40",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted">{item.message}</p>
              <p className="mt-1 text-xs text-muted">
                {formatBusinessDateTime(new Date(item.created_at))}
              </p>
            </div>
            {!item.read ? (
              <Button
                variant="secondary"
                className="min-h-10 shrink-0 px-3 text-sm"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await markNotificationRead(item.id);
                    router.refresh();
                  });
                }}
              >
                Citit
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
