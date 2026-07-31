import type { Metadata } from "next"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { loadNotificationsPage } from "@/lib/notifications/load-notifications-page"
import { NotificationsPageContent } from "@/components/portal/notifications-page-content"

export const metadata: Metadata = { title: "Benachrichtigungen — Dafinex" }

export default async function CandidateNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>
}) {
  const params = await searchParams
  const profile = await getCurrentProfile()

  const status = params.status === "read" || params.status === "unread" ? params.status : "all"
  const type = params.type ?? "all"
  const page = Number(params.page) > 0 ? Number(params.page) : 1

  const { notifications, total, pageSize } = profile
    ? await loadNotificationsPage(profile.id, { status, type, page })
    : { notifications: [], total: 0, pageSize: 20 }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Benachrichtigungen</h1>
      <NotificationsPageContent
        basePath="/candidate/notifications"
        notifications={notifications}
        total={total}
        pageSize={pageSize}
        page={page}
        status={status}
        type={type}
      />
    </div>
  )
}
