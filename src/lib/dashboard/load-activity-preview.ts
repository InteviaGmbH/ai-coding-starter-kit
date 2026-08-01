import { createClient } from "@/lib/supabase/server"
import { describeActivity } from "@/components/portal/activity-log-table"

export interface ActivityPreviewItem {
  id: string
  description: string
  actorName: string
  createdDate: string
}

/** Last 5 activity_log entries, internal-only (mirrors /internal/activity's loading pattern). */
export async function loadInternalActivityPreview(): Promise<ActivityPreviewItem[]> {
  const supabase = await createClient()

  const { data: entries, error } = await supabase
    .from("activity_log")
    .select("id, entity_type, action, created_date, actor_id")
    .order("created_date", { ascending: false })
    .limit(5)

  if (error) {
    console.error("Aktivitäts-Vorschau konnte nicht geladen werden:", error)
  }

  const rows = entries ?? []
  const actorIds = Array.from(new Set(rows.map((e) => e.actor_id).filter((v): v is string => !!v)))
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
      : { data: [] }
  const actorNameById = new Map((actors ?? []).map((a) => [a.id, a.full_name ?? a.email]))

  return rows.map((e) => ({
    id: e.id,
    description: describeActivity(e.entity_type, e.action),
    actorName: e.actor_id ? (actorNameById.get(e.actor_id) ?? "Unbekannt") : "Unbekannt",
    createdDate: e.created_date,
  }))
}
