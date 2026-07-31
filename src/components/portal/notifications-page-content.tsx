import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { NotificationsFilterBar } from "@/components/portal/notifications-filter-bar"
import { NotificationsList } from "@/components/portal/notifications-list"
import type { NotificationItem } from "@/components/portal/notification-bell"

interface Props {
  basePath: string
  notifications: NotificationItem[]
  total: number
  pageSize: number
  page: number
  status: string
  type: string
}

function buildHref(basePath: string, page: number, status: string, type: string): string {
  const params = new URLSearchParams()
  params.set("status", status)
  params.set("type", type)
  params.set("page", String(page))
  return `${basePath}?${params.toString()}`
}

export function NotificationsPageContent({
  basePath,
  notifications,
  total,
  pageSize,
  page,
  status,
  type,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-4">
      <NotificationsFilterBar currentStatus={status} currentType={type} />
      <NotificationsList notifications={notifications} />

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildHref(basePath, Math.max(1, page - 1), status, type)}
                aria-disabled={page <= 1}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href={buildHref(basePath, page, status, type)} isActive>
                {page}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <span className="px-2 text-sm text-muted-foreground">von {totalPages}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={buildHref(basePath, Math.min(totalPages, page + 1), status, type)}
                aria-disabled={page >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
