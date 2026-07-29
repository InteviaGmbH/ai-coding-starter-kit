import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { assignmentStatusLabel } from "@/components/portal/assignments-table"
import { MunicipalityContractCard } from "@/components/portal/municipality-contract-card"

export const metadata: Metadata = { title: "Einsatz — Dafinex" }

export default async function CandidateAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // RLS (assignments_select) already scopes this to the caller's own
  // candidate_id — a foreign assignment id simply resolves to no row.
  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select(
      "id, status, start_date, end_date, proposal:candidate_proposals(request:personnel_requests(title, municipality:municipalities(name)))",
    )
    .eq("id", id)
    .single()

  if (assignmentError) {
    // PGRST116 ("no rows") is the expected outcome for a foreign/unknown
    // assignment id — RLS already denied it, not an error worth logging.
    // Anything else is a real failure and should be visible in the logs.
    if (assignmentError.code !== "PGRST116") {
      console.error("Einsatzdetail konnte nicht geladen werden:", assignmentError)
    }
  }

  if (!assignment) {
    notFound()
  }

  const proposal = Array.isArray(assignment.proposal) ? assignment.proposal[0] : assignment.proposal
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
  const status = assignment.status as "proposed" | "accepted" | "active" | "completed"

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("status, generated_document_path, signed_document_path")
    .eq("assignment_id", id)
    .maybeSingle()

  if (contractError) {
    console.error("Vertrag konnte nicht geladen werden:", contractError)
  }

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
        <h1 className="text-2xl font-semibold">{municipality?.name ?? "Unbekannt"}</h1>
        {request?.title && <p className="text-sm text-muted-foreground">{request.title}</p>}
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
