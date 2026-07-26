import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import {
  MunicipalityAssignmentsTable,
  type MunicipalityAssignmentRow,
} from "@/components/portal/municipality-assignments-table"

export const metadata: Metadata = { title: "Einsätze — Dafinex" }

export default async function MunicipalityAssignmentsPage() {
  const supabase = await createClient()

  // RLS (assignments_select) already scopes this to the caller's own
  // municipality via the proposal -> request -> municipality_id chain.
  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "id, status, start_date, end_date, proposal:candidate_proposals(candidate:candidates(first_name, last_name))",
    )
    .order("created_date", { ascending: false })

  const rows: MunicipalityAssignmentRow[] = (assignments ?? []).map((a) => {
    const proposal = Array.isArray(a.proposal) ? a.proposal[0] : a.proposal
    const candidate = proposal ? (Array.isArray(proposal.candidate) ? proposal.candidate[0] : proposal.candidate) : null
    return {
      id: a.id,
      status: a.status as MunicipalityAssignmentRow["status"],
      startDate: a.start_date,
      endDate: a.end_date,
      candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : "Unbekannt",
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Einsätze</h1>
      <MunicipalityAssignmentsTable assignments={rows} />
    </div>
  )
}
