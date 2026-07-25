import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InternalRequestDetailActions } from "@/components/portal/internal-request-detail-actions"

export const metadata: Metadata = { title: "Anfrage — Dafinex" }

const statusLabel: Record<string, string> = { created: "Erstellt", reviewed: "Geprüft" }

export default async function InternalRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, title, required_skills, region, start_date, end_date, status, municipality_id")
    .eq("id", id)
    .single()

  if (!request) {
    notFound()
  }

  const { data: municipality } = await supabase
    .from("municipalities")
    .select("name")
    .eq("id", request.municipality_id)
    .single()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{request.title}</h1>
          <p className="text-muted-foreground">{municipality?.name ?? "Unbekannte Gemeinde"}</p>
        </div>
        <InternalRequestDetailActions requestId={request.id} status={request.status} />
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
    </div>
  )
}
