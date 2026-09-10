"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Înregistrare eșuată.");
        setLoading(false);
        return;
      }

      if (!data.session) {
        setInfo(
          "Cont creat. Verifică emailul pentru confirmare (dacă e activată în Supabase), apoi autentifică-te.",
        );
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Înregistrare eșuată. Verifică configurația Supabase.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          Gabi Barber
        </p>
        <h1 className="font-display text-3xl">Cont nou</h1>
        <p className="text-muted">Creează-ți contul de client.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Nume complet"
          name="full_name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label="Telefon"
          name="phone"
          type="tel"
          placeholder="+40…"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
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
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {info ? <p className="text-sm text-success">{info}</p> : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Se creează…" : "Creează cont"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        Ai deja cont?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Autentifică-te
        </Link>
      </p>
    </div>
  );
}
