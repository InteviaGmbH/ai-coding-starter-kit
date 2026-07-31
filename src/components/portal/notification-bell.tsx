"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { markNotificationRead, markAllNotificationsRead } from "@/app/notifications/actions"

export interface NotificationItem {
  id: string
  type: string
  message: string
  isRead: boolean
  createdDate: string
}

export function NotificationBell({
  notifications,
  notificationsHref,
}: {
  notifications: NotificationItem[]
  notificationsHref: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  async function handleMarkRead(id: string) {
    setPendingId(id)
    await markNotificationRead(id)
    setPendingId(null)
    router.refresh()
  }

  async function handleMarkAllRead() {
    setPendingId("all")
    await markAllNotificationsRead()
    setPendingId(null)
    router.refresh()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Benachrichtigungen">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Benachrichtigungen</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs"
              disabled={pendingId === "all"}
              onClick={handleMarkAllRead}
            >
              Alle als gelesen markieren
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Keine Benachrichtigungen.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`border-b px-3 py-2 text-sm last:border-b-0 ${n.isRead ? "text-muted-foreground" : "font-medium"}`}
              >
                <p>{n.message}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.createdDate).toLocaleDateString("de-CH")}
                  </span>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      disabled={pendingId === n.id}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      Als gelesen markieren
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t px-3 py-2 text-center">
          <Link
            href={notificationsHref}
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Alle anzeigen
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
