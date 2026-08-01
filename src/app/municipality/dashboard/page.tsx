import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { MessageThread } from "@/components/portal/message-thread"
import { loadMessageThread } from "@/lib/messages/loadThread"
import { sendMunicipalityGeneralMessage } from "@/app/municipality/messages/actions"
import { getRecentNotifications } from "@/lib/notifications/get-recent-notifications"
import { loadAssignmentStatusDistribution } from "@/lib/dashboard/load-assignment-status-distribution"
import { isWidgetVisible, type DashboardWidgetKey } from "@/lib/dashboard/widget-keys"
import { DashboardWidgetToggle } from "@/components/portal/dashboard-widget-toggle"
import { DashboardActivityList } from "@/components/portal/dashboard-activity-list"
import { DashboardQuickActions } from "@/components/portal/dashboard-quick-actions"
import { StatusDistributionChart } from "@/components/portal/status-distribution-chart"

export const metadata: Metadata = { title: "Dashboard — Dafinex" }

const AVAILABLE_WIDGETS: DashboardWidgetKey[] = ["stats", "activity", "chart", "quickActions"]

export default async function MunicipalityDashboardPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const [openRequestsResult, pendingProposalsResult, activeAssignmentsResult] = await Promise.all([
    supabase
      .from("personnel_requests")
      .select("*", { count: "exact", head: true })
      .eq("municipality_id", profile?.municipalityId ?? "")
      .eq("status", "created"),
    // RLS (candidate_proposals_select) already scopes this to requests
    // belonging to the caller's own municipality.
    supabase
      .from("candidate_proposals")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
    // RLS (assignments_select) already scopes this to the caller's own
    // municipality via the proposal -> request -> municipality_id chain.
    supabase
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ])

  for (const { error } of [openRequestsResult, pendingProposalsResult, activeAssignmentsResult]) {
    if (error) console.error("Dashboard-Kennzahlen konnten nicht vollständig geladen werden:", error)
  }

  const stats = [
    { label: "Offene Anfragen", value: openRequestsResult.count ?? 0 },
    { label: "Vorschläge zur Entscheidung", value: pendingProposalsResult.count ?? 0 },
    { label: "Aktive Einsätze", value: activeAssignmentsResult.count ?? 0 },
  ]

  const thread = profile?.municipalityId
    ? await loadMessageThread(
        { messageType: "general_municipality", municipalityId: profile.municipalityId },
        false
      )
    : null

  const [notifications, statusDistribution] = await Promise.all([
    profile ? getRecentNotifications(profile.id) : Promise.resolve([]),
    loadAssignmentStatusDistribution(),
  ])

  const hidden = profile?.hiddenDashboardWidgets ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <DashboardWidgetToggle availableWidgets={AVAILABLE_WIDGETS} hidden={hidden} />
      </div>

      {isWidgetVisible(hidden, "stats") && (
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isWidgetVisible(hidden, "quickActions") && (
        <DashboardQuickActions
          actions={[{ label: "Neue Anfrage erstellen", href: "/municipality/requests" }]}
        />
      )}

      {isWidgetVisible(hidden, "chart") && (
        <StatusDistributionChart title="Meine Einsätze nach Status" data={statusDistribution} />
      )}

      {isWidgetVisible(hidden, "activity") && (
        <DashboardActivityList
          items={notifications.slice(0, 5).map((n) => ({
            id: n.id,
            description: n.message,
            createdDate: n.createdDate,
          }))}
        />
      )}

      {thread && (
        <MessageThread
          title="Allgemeine Nachrichten an Dafinex"
          messages={thread.messages}
          subject={thread.subject}
          viewerIsInternal={false}
          counterpartLabel="Gemeinde"
          onSend={sendMunicipalityGeneralMessage}
        />
      )}
    </div>
  )
}
