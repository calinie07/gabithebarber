import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSessionUser, requireAdmin } from "@/lib/auth/session";
import { SHOP_PLACEHOLDER } from "@/lib/constants/shop";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAccountPage() {
  const profile = await requireAdmin();
  const user = await getSessionUser();
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shop_settings")
    .select("*")
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl">Cont admin</h2>
        <p className="text-sm text-muted">Date salon și cont.</p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted">Nume</p>
          <p className="font-medium">{profile.full_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Email</p>
          <p className="font-medium">{user?.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Telefon</p>
          <p className="font-medium">
            {profile.phone ?? shop?.phone ?? SHOP_PLACEHOLDER.phone}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Salon</p>
          <p className="font-medium">{shop?.name ?? SHOP_PLACEHOLDER.name}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted">Adresă</p>
          <p className="font-medium">
            {shop?.address ?? SHOP_PLACEHOLDER.address}
          </p>
        </div>
      </section>

      <SignOutButton />
    </div>
  );
}
