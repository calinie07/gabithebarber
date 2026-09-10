import { NotificationsList } from "@/components/admin/notifications-list";
import { createClient } from "@/lib/supabase/server";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_notifications")
    .select("id, title, message, read, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl">Activitate</h2>
        <p className="text-sm text-muted">
          Feed intern: rezervări noi, anulări, clienți noi.
        </p>
      </header>
      <NotificationsList items={data ?? []} />
    </div>
  );
}
