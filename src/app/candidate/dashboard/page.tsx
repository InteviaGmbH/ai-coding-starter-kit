import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

export const metadata: Metadata = { title: "Dashboard — Dafinex" }

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
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
    </div>
  )
}
