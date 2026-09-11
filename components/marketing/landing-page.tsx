import Link from "next/link";
import { BarberScissorsMark } from "@/components/marketing/barber-scissors-mark";

export function LandingPage() {
  return (
    <div className="landing flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-12">
        <header className="landing-brand flex flex-col items-center gap-5 text-center">
          <p className="landing-title text-[clamp(2.5rem,11vw,3.5rem)] leading-none tracking-[0.18em] text-white">
            GABI
          </p>
          <BarberScissorsMark className="landing-mark h-16 w-16 text-white sm:h-20 sm:w-20" />
          <p className="landing-title text-[clamp(1.15rem,5vw,1.5rem)] leading-none tracking-[0.28em] text-white">
            THE BARBER
          </p>
        </header>

        <div className="landing-cta flex w-full flex-col gap-3">
          <Link href="/login?next=/book" className="landing-btn-primary">
            Autentifică-te
          </Link>
          <Link href="/register" className="landing-btn-secondary">
            Creează cont
          </Link>
        </div>
      </div>
    </div>
  );
}
