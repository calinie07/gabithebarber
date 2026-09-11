import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (profile?.role === "admin") {
    redirect("/admin/calendar");
  }
  if (profile) {
    redirect("/book");
  }

  return <LandingPage />;
}
