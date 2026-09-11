import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes("your-project") &&
      key !== "your-anon-key",
  );
}

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request });

    if (!hasSupabaseConfig()) {
      return supabaseResponse;
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(
            cookiesToSet: {
              name: string;
              value: string;
              options?: Parameters<
                NextResponse["cookies"]["set"]
              >[2];
            }[],
          ) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    // Refresh session; never throw out of middleware.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isAuthRoute =
      pathname.startsWith("/login") || pathname.startsWith("/register");
    const isAdminRoute = pathname.startsWith("/admin");
    const isProtectedCustomer =
      pathname.startsWith("/bookings") || pathname.startsWith("/account");

    if (!user && (isAdminRoute || isProtectedCustomer)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/book";
      return NextResponse.redirect(url);
    }

    // Admin role is enforced in app/admin/layout.tsx (server).
    // Avoid extra DB calls in Edge middleware that can 500 the whole site.

    return supabaseResponse;
  } catch {
    // Fail open so a bad env key / Edge auth glitch doesn't take down the app.
    return NextResponse.next({ request });
  }
}
