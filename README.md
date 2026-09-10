# Gabi Barber — booking MVP

Mobile-first barber appointment booking for a single shop.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth) — **Free plan is enough**
- Timezone: `Europe/Bucharest`

## One-time Supabase setup

1. Copy env:

```bash
cp .env.example .env.local
```

Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

2. In Supabase **SQL Editor**, run in order:
   - `supabase/migrations/202603260001_init.sql`
   - `supabase/migrations/202609100001_busy_ranges.sql`

3. Auth → Providers → Email → **disable Confirm email** (easier for demo).

4. Create demo users:

```bash
npm run seed:demo
```

5. Promote admin — run `supabase/seed_admin.sql` in SQL Editor.

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `Admin123!` |
| Client | `client@example.com` | `Client123!` |

## Run (computer + phone on same Wi‑Fi)

```bash
npm install
npm run dev
```

- Computer: http://localhost:3000  
- Phone: http://YOUR-LAN-IP:3000 (find IP with `ipconfig getifaddr en0` on Mac)

Login page has **Intră ca Admin** / **Intră ca Client** buttons.

## What works in this demo

- Client: book (service → day → time → confirm), my bookings, cancel, contact
- Admin: day calendar, appointment details (Call/SMS/WhatsApp), breaks, clients, activity feed
