import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { MessageThread } from "@/components/portal/message-thread"
import { loadMessageThread } from "@/lib/messages/loadThread"
import { sendMunicipalityGeneralMessage } from "@/app/municipality/messages/actions"

export const metadata: Metadata = { title: "Dashboard — Dafinex" }

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
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
