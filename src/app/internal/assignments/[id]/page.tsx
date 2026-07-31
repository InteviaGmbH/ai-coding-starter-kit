import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { assignmentStatusLabel } from "@/components/portal/assignments-table"
import { AssignmentStatusActions } from "@/components/portal/assignment-status-actions"
import { ContractCard } from "@/components/portal/contract-card"
import { MessageThread } from "@/components/portal/message-thread"
import { InternalNotesPanel } from "@/components/portal/internal-notes-panel"
import { loadMessageThread } from "@/lib/messages/loadThread"
import { loadInternalNotes } from "@/lib/notes/loadNotes"
import { sendInternalMessage } from "@/app/internal/messages/actions"
import { addInternalNote, deleteInternalNote } from "@/app/internal/notes/actions"

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

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, generated_document_path, signed_document_path")
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

  const [thread, notes] = await Promise.all([
    loadMessageThread({ messageType: "assignment", assignmentId: id }, true),
    loadInternalNotes("assignment", id),
  ])

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

      <ContractCard
        assignmentId={assignment.id}
        assignmentStatus={status}
        contract={contract ? { id: contract.id, status: contract.status as "generated" | "signed" } : null}
        generatedDownloadUrl={generatedDownloadUrl}
        signedDownloadUrl={signedDownloadUrl}
      />

      <MessageThread
        messages={thread.messages}
        subject={thread.subject}
        viewerIsInternal={true}
        counterpartLabel="Kandidat"
        onSend={(input) =>
          sendInternalMessage({ messageType: "assignment", assignmentId: assignment.id }, input)
        }
      />

      <InternalNotesPanel
        notes={notes}
        onAdd={(content) => addInternalNote("assignment", assignment.id, content)}
        onDelete={(noteId) => deleteInternalNote("assignment", assignment.id, noteId)}
      />
    </div>
  )
}
