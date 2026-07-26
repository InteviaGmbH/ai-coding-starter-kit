import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { AssignmentsTable, type AssignmentRow } from "@/components/portal/assignments-table"

export const metadata: Metadata = { title: "Einsätze — Dafinex" }

export default async function InternalAssignmentsPage() {
  const supabase = await createClient()

  const { data: assignments } = await supabase
    .from("assignments")
    .select(
      "id, status, start_date, end_date, proposal:candidate_proposals(candidate:candidates(first_name, last_name), request:personnel_requests(title, municipality:municipalities(name)))",
    )
    .order("created_date", { ascending: false })

  const rows: AssignmentRow[] = (assignments ?? []).map((a) => {
    const proposal = Array.isArray(a.proposal) ? a.proposal[0] : a.proposal
    const candidate = proposal ? (Array.isArray(proposal.candidate) ? proposal.candidate[0] : proposal.candidate) : null
    const request = proposal ? (Array.isArray(proposal.request) ? proposal.request[0] : proposal.request) : null
    const municipality = request ? (Array.isArray(request.municipality) ? request.municipality[0] : request.municipality) : null
    return {
      id: a.id,
      status: a.status as AssignmentRow["status"],
      startDate: a.start_date,
      endDate: a.end_date,
      candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : "Unbekannt",
      municipalityName: municipality?.name ?? "Unbekannt",
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Einsätze</h1>
      <AssignmentsTable assignments={rows} />
    </div>
  )
}
