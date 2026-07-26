import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { ActivityLogTable, type ActivityLogRow } from "@/components/portal/activity-log-table"

export const metadata: Metadata = { title: "Aktivitäten — Dafinex" }

export default async function InternalActivityPage() {
  const supabase = await createClient()

  // `activity_log` has two foreign keys into `profiles` (actor_id and
  // created_by_id), so PostgREST's implicit embedding (`actor:profiles(...)`)
  // is ambiguous and fails with PGRST201 — same reason PROJ-7's
  // `proposedByName` already does a separate lookup query instead of an
  // embed. A bare `{ data }` destructure without checking `error` made this
  // fail silently (empty list) rather than surfacing the error.
  const { data: entries } = await supabase
    .from("activity_log")
    .select("id, entity_type, action, created_date, actor_id")
    .order("created_date", { ascending: false })
    .limit(50)

  const actorIds = Array.from(
    new Set((entries ?? []).map((e) => e.actor_id).filter((v): v is string => !!v)),
  )
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
      : { data: [] }
  const actorNameById = new Map((actors ?? []).map((a) => [a.id, a.full_name ?? a.email]))

  const rows: ActivityLogRow[] = (entries ?? []).map((e) => ({
    id: e.id,
    entityType: e.entity_type,
    action: e.action,
    actorName: e.actor_id ? actorNameById.get(e.actor_id) ?? "Unbekannt" : "Unbekannt",
    createdDate: e.created_date,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Aktivitäten</h1>
      <ActivityLogTable entries={rows} />
    </div>
  )
}
