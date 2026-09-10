import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project") &&
      key !== "your-anon-key" &&
      key.length > 20,
  );
}

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase env vars missing on the server. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options?: any;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — middleware will refresh sessions.
          }
        },
      },
    },
  );
}
