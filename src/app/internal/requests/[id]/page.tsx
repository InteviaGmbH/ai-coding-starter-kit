import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InternalRequestDetailActions } from "@/components/portal/internal-request-detail-actions"
import { MessageThread } from "@/components/portal/message-thread"
import { InternalNotesPanel } from "@/components/portal/internal-notes-panel"
import { loadMessageThread } from "@/lib/messages/loadThread"
import { loadInternalNotes } from "@/lib/notes/loadNotes"
import { sendInternalMessage } from "@/app/internal/messages/actions"
import { addInternalNote, deleteInternalNote } from "@/app/internal/notes/actions"

export const metadata: Metadata = { title: "Anfrage — Dafinex" }

const statusLabel: Record<string, string> = { created: "Erstellt", reviewed: "Geprüft" }

export default async function InternalRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from("personnel_requests")
    .select(
      "id, title, required_skills, region, start_date, end_date, required_workload_percent, status, municipality_id, visible_to_partners"
    )
    .eq("id", id)
    .single()

  if (requestError && requestError.code !== "PGRST116") {
    console.error("Anfrage konnte nicht geladen werden:", requestError)
  }

  if (!request) {
    notFound()
  }

  const { data: municipality } = await supabase
    .from("municipalities")
    .select("name")
    .eq("id", request.municipality_id)
    .single()

  const { count: proposalCount } = await supabase
    .from("candidate_proposals")
    .select("id", { count: "exact", head: true })
    .eq("request_id", request.id)

  const [thread, notes] = await Promise.all([
    loadMessageThread({ messageType: "request", requestId: request.id }, true),
    loadInternalNotes("request", request.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{request.title}</h1>
          <p className="text-muted-foreground">{municipality?.name ?? "Unbekannte Gemeinde"}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/internal/requests/${request.id}/candidates`}>Kandidaten suchen</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/internal/requests/${request.id}/proposals`}>
              Vorschläge ({proposalCount ?? 0})
            </Link>
          </Button>
          <InternalRequestDetailActions
            requestId={request.id}
            status={request.status}
            visibleToPartners={request.visible_to_partners}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge variant={request.status === "reviewed" ? "default" : "secondary"}>
              {statusLabel[request.status]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Zeitraum</p>
            <p>
              {request.start_date}
              {request.end_date ? ` – ${request.end_date}` : ""}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Region</p>
            <p>{request.region || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Benötigtes Pensum</p>
            <p>
              {request.required_workload_percent != null
                ? `${request.required_workload_percent}%`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Benötigte Fähigkeiten</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {request.required_skills && request.required_skills.length > 0 ? (
                request.required_skills.map((s: string) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <MessageThread
        messages={thread.messages}
        subject={thread.subject}
        viewerIsInternal={true}
        counterpartLabel="Gemeinde"
        onSend={(input) =>
          sendInternalMessage({ messageType: "request", requestId: request.id }, input)
        }
      />

      <InternalNotesPanel
        notes={notes}
        onAdd={(content) => addInternalNote("request", request.id, content)}
        onDelete={(noteId) => deleteInternalNote("request", request.id, noteId)}
      />
    </div>
  )
}
