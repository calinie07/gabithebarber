/**
 * Demo accounts for showing the app to the barber.
 * Create them with: npm run seed:demo
 * Then promote admin with supabase/seed_admin.sql
 */
export const DEMO_ACCOUNTS = {
  admin: {
    email: "admin@example.com",
    password: "Admin123!",
    fullName: "Gabi Admin",
    phone: "+40721234567",
  },
  client: {
    email: "client@example.com",
    password: "Client123!",
    fullName: "Alex Client",
    phone: "+40722111222",
  },
} as const;
