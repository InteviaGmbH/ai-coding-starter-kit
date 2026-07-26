import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { assignmentStatusLabel } from "@/components/portal/assignments-table"
import { AssignmentStatusActions } from "@/components/portal/assignment-status-actions"

export const metadata: Metadata = { title: "Einsatz — Dafinex" }

export default async function InternalAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, status, start_date, end_date, proposal:candidate_proposals(candidate:candidates(first_name, last_name), request:personnel_requests(title, municipality:municipalities(name)))",
    )
    .eq("id", id)
    .single()

  if (!assignment) {
    notFound()
  }

  const proposal = Array.isArray(assignment.proposal) ? assignment.proposal[0] : assignment.proposal
  const candidate = proposal ? (Array.isArray(proposal.candidate) ? proposal.candidate[0] : proposal.candidate) : null
  const request = proposal ? (Array.isArray(proposal.request) ? proposal.request[0] : proposal.request) : null
  const municipality = request ? (Array.isArray(request.municipality) ? request.municipality[0] : request.municipality) : null

  const status = assignment.status as "proposed" | "accepted" | "active" | "completed"

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {candidate ? `${candidate.first_name} ${candidate.last_name}` : "Unbekannt"}
          </h1>
          <p className="text-muted-foreground">
            {municipality?.name ?? "Unbekannte Gemeinde"} — {request?.title ?? "Unbekannte Anfrage"}
          </p>
        </div>
        <AssignmentStatusActions assignmentId={assignment.id} status={status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge>{assignmentStatusLabel[status]}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Zeitraum</p>
            <p>
              {assignment.start_date}
              {assignment.end_date ? ` – ${assignment.end_date}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
