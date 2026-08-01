import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { runReminderChecks } from "@/lib/reminders/run-reminder-checks"
import { loadInternalActivityPreview } from "@/lib/dashboard/load-activity-preview"
import { loadAssignmentStatusDistribution } from "@/lib/dashboard/load-assignment-status-distribution"
import { isWidgetVisible, type DashboardWidgetKey } from "@/lib/dashboard/widget-keys"
import { DashboardWidgetToggle } from "@/components/portal/dashboard-widget-toggle"
import { DashboardActivityList } from "@/components/portal/dashboard-activity-list"
import { DashboardQuickActions } from "@/components/portal/dashboard-quick-actions"
import { StatusDistributionChart } from "@/components/portal/status-distribution-chart"

export const metadata: Metadata = { title: "Dashboard — Dafinex" }

const AVAILABLE_WIDGETS: DashboardWidgetKey[] = ["stats", "activity", "chart", "quickActions"]

export default async function InternalDashboardPage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  // PROJ-18: event-based reminder check — no cron infrastructure exists,
  // so this runs as a side effect of loading the one page every internal
  // user visits on every login.
  await runReminderChecks()

  const [
    municipalitiesResult,
    candidatesResult,
    openRequestsResult,
    pendingApprovalsResult,
    activityPreview,
    statusDistribution,
  ] = await Promise.all([
    supabase.from("municipalities").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase
      .from("personnel_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "created"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("account_status", "pending"),
    loadInternalActivityPreview(),
    loadAssignmentStatusDistribution(),
  ])

  for (const { error } of [municipalitiesResult, candidatesResult, openRequestsResult, pendingApprovalsResult]) {
    if (error) console.error("Dashboard-Kennzahlen konnten nicht vollständig geladen werden:", error)
  }

  const stats = [
    { label: "Gemeinden", value: municipalitiesResult.count ?? 0 },
    { label: "Kandidaten", value: candidatesResult.count ?? 0 },
    { label: "Offene Anfragen", value: openRequestsResult.count ?? 0 },
  ]

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
          actions={[
            { label: "Neue Gemeinde", href: "/internal/municipalities" },
            { label: "Neuer Kandidat", href: "/internal/candidates" },
            {
              label: "Freischaltungen",
              href: "/internal/approvals",
              badgeCount: pendingApprovalsResult.count ?? 0,
            },
          ]}
        />
      )}

      {isWidgetVisible(hidden, "chart") && <StatusDistributionChart data={statusDistribution} />}

      {isWidgetVisible(hidden, "activity") && (
        <DashboardActivityList
          items={activityPreview.map((a) => ({
            id: a.id,
            description: a.description,
            subtitle: a.actorName,
            createdDate: a.createdDate,
          }))}
        />
      )}
    </div>
  )
}
