import { mapsHref, SHOP_PLACEHOLDER, telHref } from "@/lib/constants/shop";
import { createClient } from "@/lib/supabase/server";

async function getShop() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("shop_settings").select("*").maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export default async function ContactPage() {
  const shop = await getShop();
  const name = shop?.name ?? SHOP_PLACEHOLDER.name;
  const phone = shop?.phone ?? SHOP_PLACEHOLDER.phone;
  const address = shop?.address ?? SHOP_PLACEHOLDER.address;
  const mapsQuery = shop?.maps_query ?? address;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Contact</h1>
        <p className="mt-2 text-muted">Locație și program.</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Salon</p>
          <h2 className="font-display text-2xl">{name}</h2>
        </div>

        <a
          href={telHref(phone)}
          className="block min-h-12 rounded-xl bg-background px-4 py-3 text-base font-medium"
        >
          Sună: {phone}
        </a>

        <a
          href={mapsHref(mapsQuery)}
          target="_blank"
          rel="noreferrer"
          className="block min-h-12 rounded-xl bg-background px-4 py-3 text-base font-medium"
        >
          Deschide pe hartă: {address}
        </a>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-xl">Program</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between gap-4">
            <span>Luni – Vineri</span>
            <span className="text-muted">09:00 – 18:00</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Sâmbătă</span>
            <span className="text-muted">09:00 – 14:00</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Duminică</span>
            <span className="text-muted">Închis</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
