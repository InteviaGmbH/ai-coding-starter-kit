import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PersonnelRequestFormDialog } from "@/components/portal/personnel-request-form-dialog"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Anfrage — Dafinex" }

const statusLabel: Record<string, string> = { created: "Erstellt", reviewed: "Geprüft" }

export default async function MunicipalityRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from("personnel_requests")
    .select(
      "id, title, required_skills, region, start_date, end_date, required_workload_percent, status"
    )
    .eq("id", id)
    .single()

  if (requestError && requestError.code !== "PGRST116") {
    console.error("Anfrage konnte nicht geladen werden:", requestError)
  }

  if (!request) {
    notFound()
  }

  const editable = request.status === "created"

  const { count: proposalCount } = await supabase
    .from("candidate_proposals")
    .select("id", { count: "exact", head: true })
    .eq("request_id", request.id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold">{request.title}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/municipality/requests/${request.id}/proposals`}>
              Vorschläge ({proposalCount ?? 0})
            </Link>
          </Button>
          <PersonnelRequestFormDialog
            mode="edit"
            requestId={request.id}
            defaultValues={{
              title: request.title,
              requiredSkills: (request.required_skills ?? []).join(", "),
              region: request.region ?? "",
              startDate: request.start_date,
              endDate: request.end_date ?? "",
              requiredWorkloadPercent: request.required_workload_percent?.toString() ?? "",
            }}
            trigger={<Button disabled={!editable}>Bearbeiten</Button>}
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
          {!editable && (
            <p className="text-muted-foreground">
              Diese Anfrage wurde bereits geprüft und kann nicht mehr bearbeitet werden.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
