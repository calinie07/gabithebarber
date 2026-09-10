import Link from "next/link";
import { CalendarDays, MapPin, Scissors, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/", label: "Programare", icon: Scissors },
  { href: "/bookings", label: "Rezervări", icon: CalendarDays },
  { href: "/contact", label: "Contact", icon: MapPin },
  { href: "/account", label: "Cont", icon: UserRound },
] as const;

export function CustomerBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium",
                  active ? "bg-accent text-white" : "text-muted",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
