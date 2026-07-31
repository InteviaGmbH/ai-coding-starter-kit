"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { NotificationItem } from "@/components/portal/notification-bell"
import { notificationTypeLabel } from "@/lib/notifications/type-labels"
import { markNotificationRead } from "@/app/notifications/actions"

export function NotificationsList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (notifications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine Benachrichtigungen für die aktuelle Filterauswahl gefunden.
      </p>
    )
  }

  async function handleMarkRead(id: string) {
    setPendingId(id)
    await markNotificationRead(id)
    setPendingId(null)
    router.refresh()
  }

  return (
    <ul className="space-y-2">
      {notifications.map((n) => (
        <li
          key={n.id}
          className={`flex items-start justify-between gap-3 rounded-md border p-3 text-sm ${n.isRead ? "text-muted-foreground" : ""}`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{notificationTypeLabel(n.type)}</Badge>
              {!n.isRead && <Badge>Ungelesen</Badge>}
            </div>
            <p className={n.isRead ? "" : "font-medium"}>{n.message}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(n.createdDate).toLocaleString("de-CH")}
            </p>
          </div>
          {!n.isRead && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pendingId === n.id}
              onClick={() => handleMarkRead(n.id)}
            >
              Als gelesen markieren
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
