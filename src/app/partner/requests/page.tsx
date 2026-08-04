import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { PartnerRequestsTable, type PartnerRequestRow } from "@/components/portal/partner-requests-table"

export const metadata: Metadata = { title: "Anfragen — Dafinex" }

export default async function PartnerRequestsPage() {
  const supabase = await createClient()

  // Deliberately no municipality join/field here — a partner firm never
  // sees which municipality a request belongs to, only the criteria
  // (PROJ-13 scope decision). RLS (personnel_requests_select_partner)
  // already restricts rows to visible_to_partners = true for this role;
  // the explicit filter below is just query-level intent, same pattern as
  // the municipality/candidate list pages.
  const { data: requests } = await supabase
    .from("personnel_requests")
    .select("id, title, required_skills, region, start_date, end_date, required_workload_percent")
    .eq("visible_to_partners", true)
    .order("created_date", { ascending: false })

  const rows: PartnerRequestRow[] = (requests ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    requiredSkills: r.required_skills ?? [],
    region: r.region,
    startDate: r.start_date,
    endDate: r.end_date,
    requiredWorkloadPercent: r.required_workload_percent,
  }))

  const { data: ownCandidates } = await supabase
    .from("candidates")
    .select("id, first_name, last_name")
    .order("last_name", { ascending: true })

  const candidateOptions = (ownCandidates ?? []).map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Anfragen</h1>
      <PartnerRequestsTable requests={rows} ownCandidates={candidateOptions} />
    </div>
  )
}
