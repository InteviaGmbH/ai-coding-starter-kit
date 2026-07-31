import { createClient } from "@/lib/supabase/server"
import type { NotificationItem } from "@/components/portal/notification-bell"

export const NOTIFICATIONS_PAGE_SIZE = 20

export interface NotificationsPageFilter {
  status: "all" | "read" | "unread"
  type: string
  page: number
}

export interface NotificationsPageResult {
  notifications: NotificationItem[]
  total: number
  pageSize: number
}

export async function loadNotificationsPage(
  profileId: string,
  filter: NotificationsPageFilter
): Promise<NotificationsPageResult> {
  const supabase = await createClient()
  const page = Math.max(1, filter.page)
  const from = (page - 1) * NOTIFICATIONS_PAGE_SIZE
  const to = from + NOTIFICATIONS_PAGE_SIZE - 1

  let query = supabase
    .from("notifications")
    .select("id, type, message, is_read, created_date", { count: "exact" })
    .eq("recipient_id", profileId)

  if (filter.status === "read") query = query.eq("is_read", true)
  if (filter.status === "unread") query = query.eq("is_read", false)
  if (filter.type !== "all") query = query.eq("type", filter.type)

  const { data, error, count } = await query
    .order("created_date", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Benachrichtigungen konnten nicht geladen werden:", error)
  }

  return {
    notifications: (data ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      isRead: n.is_read,
      createdDate: n.created_date,
    })),
    total: count ?? 0,
    pageSize: NOTIFICATIONS_PAGE_SIZE,
  }
}
