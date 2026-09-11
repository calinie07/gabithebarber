import Image from "next/image";
import Link from "next/link";
import {
  mapsHref,
  SHOP_PLACEHOLDER,
  telHref,
} from "@/lib/constants/shop";

export function LandingPage() {
  return (
    <div className="landing">
      <section className="landing-hero relative isolate min-h-dvh overflow-hidden">
        <div className="landing-hero-media absolute inset-0">
          <Image
            src="/landing/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="landing-hero-veil absolute inset-0" aria-hidden />
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col justify-end px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-16 sm:px-8 sm:pb-14">
          <div className="mx-auto w-full max-w-lg space-y-8">
            <header className="landing-brand space-y-4">
              <h1 className="landing-title text-[clamp(2.75rem,12vw,4.25rem)] leading-[0.92] tracking-[-0.03em] text-[#f4efe6]">
                Gabi
                <span className="block text-[#c4a574]">the Barber</span>
              </h1>
              <p className="landing-line max-w-[18rem] text-base leading-relaxed text-[#d7cfc3]">
                {"Tunsoare precisă în Aiud — rezervă online."}
              </p>
            </header>

            <div className="landing-cta flex flex-col gap-3 sm:flex-row">
              <Link href="/login?next=/book" className="landing-btn-primary">
                Autentifică-te
              </Link>
              <Link href="/register" className="landing-btn-secondary">
                Creează cont
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0c0b0a] px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3 text-sm text-[#a59a8c]">
          <a
            href={mapsHref(SHOP_PLACEHOLDER.mapsQuery)}
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-[#c4a574]"
          >
            {SHOP_PLACEHOLDER.address}
          </a>
          <a
            href={telHref(SHOP_PLACEHOLDER.phone)}
            className="transition hover:text-[#c4a574]"
          >
            {SHOP_PLACEHOLDER.phoneDisplay}
          </a>
        </div>
      </section>
    </div>
  );
}
