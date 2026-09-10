/**
 * Creates the two demo auth users (admin + client) via Supabase signup API.
 *
 * Usage:
 *   npm run seed:demo
 *
 * Then in Supabase SQL Editor run supabase/seed_admin.sql
 *
 * Also disable "Confirm email" in Authentication → Providers → Email for easy demo.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon || url.includes("your-project")) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY in env.");
  process.exit(1);
}

const accounts = [
  {
    email: "admin@example.com",
    password: "Admin123!",
    full_name: "Gabi Admin",
    phone: "+40721234567",
  },
  {
    email: "client@example.com",
    password: "Client123!",
    full_name: "Alex Client",
    phone: "+40722111222",
  },
];

async function signup(account) {
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      data: {
        full_name: account.full_name,
        phone: account.phone,
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log(
      `× ${account.email}: ${body.msg || body.error_description || body.error || res.status}`,
    );
    return;
  }
  console.log(`✓ ${account.email} created (or already exists)`);
}

for (const account of accounts) {
  await signup(account);
}

console.log("\nNext: run supabase/seed_admin.sql in the SQL Editor.");
