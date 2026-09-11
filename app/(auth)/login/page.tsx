"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/book";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(nextEmail: string, nextPassword: string) {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: nextEmail,
        password: nextPassword,
      });

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("rate limit")) {
          setError(
            "Limită email Supabase. Creează userii din Dashboard (Add user + Auto Confirm), nu din app. Așteaptă ~1 oră sau folosește userii deja creați.",
          );
        } else if (msg.includes("invalid login")) {
          setError(
            "Cont inexistent sau parolă greșită. Verifică emailul și parola.",
          );
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let destination =
        next.startsWith("/") && !next.startsWith("//") ? next : "/book";
      if (destination === "/") {
        destination = "/book";
      }
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role === "admin") {
          destination = "/admin/calendar";
        }
      }

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Eroare la autentificare. Verifică Supabase.",
      );
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await signIn(email, password);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Parolă"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Se conectează…" : "Intră în cont"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          Gabi the Barber
        </p>
        <h1 className="font-display text-3xl">Autentificare</h1>
        <p className="text-muted">Intră în cont pentru a rezerva.</p>
      </header>

      <Suspense fallback={<p className="text-sm text-muted">Se încarcă…</p>}>
        <LoginForm />
      </Suspense>

      <p className="text-center text-sm text-muted">
        Nu ai cont?{" "}
        <Link href="/register" className="font-medium text-foreground underline">
          Înregistrează-te
        </Link>
      </p>
    </div>
  );
}
