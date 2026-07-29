import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import {
  CandidateAssignmentsTable,
  type CandidateAssignmentRow,
} from "@/components/portal/candidate-assignments-table"

export const metadata: Metadata = { title: "Einsätze — Dafinex" }

export default async function CandidateAssignmentsPage() {
  const supabase = await createClient()

  // RLS (assignments_select) already scopes this to the caller's own
  // candidate_id via the proposal -> candidate chain.
  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "id, status, start_date, end_date, proposal:candidate_proposals(request:personnel_requests(municipality:municipalities(name)))",
    )
    .order("created_date", { ascending: false })

  const rows: CandidateAssignmentRow[] = (assignments ?? []).map((a) => {
    const proposal = Array.isArray(a.proposal) ? a.proposal[0] : a.proposal
    const request = proposal
      ? Array.isArray(proposal.request)
        ? proposal.request[0]
        : proposal.request
      : null
    const municipality = request
      ? Array.isArray(request.municipality)
        ? request.municipality[0]
        : request.municipality
      : null
    return {
      id: a.id,
      status: a.status as CandidateAssignmentRow["status"],
      startDate: a.start_date,
      endDate: a.end_date,
      municipalityName: municipality?.name ?? "Unbekannt",
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Einsätze</h1>
      <CandidateAssignmentsTable assignments={rows} />
    </div>
  )
}
