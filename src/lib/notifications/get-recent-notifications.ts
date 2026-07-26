import { createClient } from "@/lib/supabase/server"
import type { NotificationItem } from "@/components/portal/notification-bell"

export async function getRecentNotifications(profileId: string): Promise<NotificationItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("notifications")
    .select("id, type, message, is_read, created_date")
    .eq("recipient_id", profileId)
    .order("created_date", { ascending: false })
    .limit(10)

  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    isRead: n.is_read,
    createdDate: n.created_date,
  }))
}
