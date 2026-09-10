"use client";

import { usePathname } from "next/navigation";
import { CustomerBottomNav } from "@/components/customer/bottom-nav";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-background">
      <main className="px-4 pb-28 pt-6">{children}</main>
      <CustomerBottomNav pathname={pathname} />
    </div>
  );
}
