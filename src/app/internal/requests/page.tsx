import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { InternalRequestsTable, type InternalRequestRow } from "@/components/portal/internal-requests-table"

export const metadata: Metadata = { title: "Personalanfragen — Dafinex" }

export default async function InternalRequestsPage() {
  const supabase = await createClient()

  const { data: requests } = await supabase
    .from("personnel_requests")
    .select("id, title, start_date, end_date, status, created_date, municipality_id")
    .order("created_date", { ascending: false })

  const municipalityIds = [...new Set((requests ?? []).map((r) => r.municipality_id))]
  const { data: municipalities } =
    municipalityIds.length > 0
      ? await supabase.from("municipalities").select("id, name").in("id", municipalityIds)
      : { data: [] }

  const municipalityNameById = new Map((municipalities ?? []).map((m) => [m.id, m.name]))

  const rows: InternalRequestRow[] = (requests ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    municipalityName: municipalityNameById.get(r.municipality_id) ?? "Unbekannt",
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    createdDate: r.created_date,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Personalanfragen</h1>
      <InternalRequestsTable requests={rows} />
    </div>
  )
}
