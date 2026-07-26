import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { assignmentStatusLabel } from "@/components/portal/assignments-table"
import { MunicipalityContractCard } from "@/components/portal/municipality-contract-card"

export const metadata: Metadata = { title: "Einsatz — Dafinex" }

export default async function MunicipalityAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // RLS (assignments_select) already scopes this to the caller's own
  // municipality.
  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, status, start_date, end_date, proposal:candidate_proposals(candidate:candidates(first_name, last_name))",
    )
    .eq("id", id)
    .single()

  if (!assignment) {
    notFound()
  }

  const proposal = Array.isArray(assignment.proposal) ? assignment.proposal[0] : assignment.proposal
  const candidate = proposal ? (Array.isArray(proposal.candidate) ? proposal.candidate[0] : proposal.candidate) : null
  const status = assignment.status as "proposed" | "accepted" | "active" | "completed"

  const { data: contract } = await supabase
    .from("contracts")
    .select("status, generated_document_path, signed_document_path")
    .eq("assignment_id", id)
    .maybeSingle()

  let generatedDownloadUrl: string | null = null
  let signedDownloadUrl: string | null = null
  if (contract?.generated_document_path) {
    const { data: signed } = await supabase.storage
      .from("contracts")
      .createSignedUrl(contract.generated_document_path, 300)
    generatedDownloadUrl = signed?.signedUrl ?? null
  }
  if (contract?.signed_document_path) {
    const { data: signed } = await supabase.storage
      .from("contracts")
      .createSignedUrl(contract.signed_document_path, 300)
    signedDownloadUrl = signed?.signedUrl ?? null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {candidate ? `${candidate.first_name} ${candidate.last_name}` : "Unbekannt"}
        </h1>
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

      <MunicipalityContractCard
        contract={contract ? { status: contract.status as "generated" | "signed" } : null}
        generatedDownloadUrl={generatedDownloadUrl}
        signedDownloadUrl={signedDownloadUrl}
      />
    </div>
  )
}
