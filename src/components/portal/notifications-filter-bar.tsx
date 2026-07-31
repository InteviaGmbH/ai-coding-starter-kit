"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notifications/type-labels"

interface Props {
  currentStatus: string
  currentType: string
}

export function NotificationsFilterBar({ currentStatus, currentType }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={currentStatus} onValueChange={(v) => updateParam("status", v)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Status</SelectItem>
          <SelectItem value="unread">Ungelesen</SelectItem>
          <SelectItem value="read">Gelesen</SelectItem>
        </SelectContent>
      </Select>
      <Select value={currentType} onValueChange={(v) => updateParam("type", v)}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Typen</SelectItem>
          {Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
