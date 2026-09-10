"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarRange,
  CircleUserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/admin/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/admin/clients", label: "Clienți", icon: Users },
  { href: "/admin/notifications", label: "Activitate", icon: Bell },
  { href: "/admin/account", label: "Cont", icon: CircleUserRound },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-[var(--admin-bg)] text-[var(--admin-ink)]">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Admin
            </p>
            <h1 className="font-display text-xl">Gabi Barber</h1>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-2 pb-2">
          <ul className="flex min-w-max gap-1">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium",
                      active
                        ? "bg-accent text-white"
                        : "text-muted hover:bg-black/5",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
