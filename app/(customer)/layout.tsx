import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer/customer-shell";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (profile?.role === "admin") {
    redirect("/admin/calendar");
  }

  return <CustomerShell>{children}</CustomerShell>;
}
