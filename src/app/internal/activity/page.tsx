import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { ActivityLogTable, type ActivityLogRow } from "@/components/portal/activity-log-table"

export const metadata: Metadata = { title: "Aktivitäten — Dafinex" }

export default async function InternalActivityPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from("activity_log")
    .select("id, entity_type, action, created_date, actor:profiles(full_name, email)")
    .order("created_date", { ascending: false })
    .limit(50)

  const rows: ActivityLogRow[] = (entries ?? []).map((e) => {
    const actor = Array.isArray(e.actor) ? e.actor[0] : e.actor
    return {
      id: e.id,
      entityType: e.entity_type,
      action: e.action,
      actorName: actor?.full_name ?? actor?.email ?? "Unbekannt",
      createdDate: e.created_date,
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Aktivitäten</h1>
      <ActivityLogTable entries={rows} />
    </div>
  )
}
