import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Dashboard — Dafinex" }

export default async function InternalDashboardPage() {
  const supabase = await createClient()

  const [municipalitiesResult, candidatesResult, openRequestsResult] = await Promise.all([
    supabase.from("municipalities").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase
      .from("personnel_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "created"),
  ])

  for (const { error } of [municipalitiesResult, candidatesResult, openRequestsResult]) {
    if (error) console.error("Dashboard-Kennzahlen konnten nicht vollständig geladen werden:", error)
  }

  const stats = [
    { label: "Gemeinden", value: municipalitiesResult.count ?? 0 },
    { label: "Kandidaten", value: candidatesResult.count ?? 0 },
    { label: "Offene Anfragen", value: openRequestsResult.count ?? 0 },
  ]

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
    </div>
  )
}
