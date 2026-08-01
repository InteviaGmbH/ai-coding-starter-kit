import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { MessageThread } from "@/components/portal/message-thread"
import { loadMessageThread } from "@/lib/messages/loadThread"
import { sendCandidateGeneralMessage } from "@/app/candidate/messages/actions"
import { getRecentNotifications } from "@/lib/notifications/get-recent-notifications"
import { isWidgetVisible, type DashboardWidgetKey } from "@/lib/dashboard/widget-keys"
import { DashboardWidgetToggle } from "@/components/portal/dashboard-widget-toggle"
import { DashboardActivityList } from "@/components/portal/dashboard-activity-list"
import { DashboardQuickActions } from "@/components/portal/dashboard-quick-actions"

export const metadata: Metadata = { title: "Dashboard — Dafinex" }

const AVAILABLE_WIDGETS: DashboardWidgetKey[] = ["stats", "activity", "quickActions"]

export default async function CandidateDashboardPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const [candidateResult, proposalsResult, activeAssignmentsResult] = await Promise.all([
    supabase
      .from("candidates")
      .select("availability, region")
      .eq("id", profile?.candidateId ?? "")
      .maybeSingle(),
    // RLS (candidate_proposals_select) already scopes this to the caller's
    // own candidate_id.
    supabase.from("candidate_proposals").select("*", { count: "exact", head: true }),
    // RLS (assignments_select) already scopes this to the caller's own
    // candidate_id via the proposal -> candidate chain.
    supabase
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ])

  for (const { error } of [candidateResult, proposalsResult, activeAssignmentsResult]) {
    if (error) console.error("Dashboard-Kennzahlen konnten nicht vollständig geladen werden:", error)
  }

  const stats = [
    { label: "Verfügbarkeit", value: candidateResult.data?.availability ?? "—" },
    { label: "Region", value: candidateResult.data?.region ?? "—" },
    { label: "Eigene Vorschläge", value: proposalsResult.count ?? 0 },
    { label: "Aktive Einsätze", value: activeAssignmentsResult.count ?? 0 },
  ]

  const thread = profile?.candidateId
    ? await loadMessageThread(
        { messageType: "general_candidate", candidateId: profile.candidateId },
        false
      )
    : null

  const notifications = profile ? await getRecentNotifications(profile.id) : []
  const hidden = profile?.hiddenDashboardWidgets ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <DashboardWidgetToggle availableWidgets={AVAILABLE_WIDGETS} hidden={hidden} />
      </div>

      {isWidgetVisible(hidden, "stats") && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isWidgetVisible(hidden, "quickActions") && (
        <DashboardQuickActions
          actions={[
            { label: "Profil bearbeiten", href: "/candidate/profile" },
            { label: "Dokumente verwalten", href: "/candidate/profile" },
          ]}
        />
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
          counterpartLabel="Kandidat"
          onSend={sendCandidateGeneralMessage}
        />
      )}
    </div>
  )
}
