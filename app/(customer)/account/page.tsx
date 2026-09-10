import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireProfile, getSessionUser } from "@/lib/auth/session";

export default async function AccountPage() {
  const profile = await requireProfile();
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Cont</h1>
        <p className="mt-2 text-muted">Datele tale de client.</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <div>
          <p className="text-xs text-muted">Nume</p>
          <p className="text-lg font-medium">{profile.full_name || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Email</p>
          <p className="text-lg font-medium">{user?.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Telefon</p>
          <p className="text-lg font-medium">{profile.phone || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Rol</p>
          <p className="text-lg font-medium">{profile.role}</p>
        </div>
      </section>

      {profile.role === "admin" ? (
        <Link href="/admin/calendar">
          <Button fullWidth variant="secondary">
            Deschide panoul admin
          </Button>
        </Link>
      ) : null}

      <SignOutButton />
    </div>
  );
}
