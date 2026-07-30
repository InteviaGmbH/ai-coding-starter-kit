import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CandidateDetailActions } from "@/components/portal/candidate-detail-actions"
import { CandidateDocumentsManager } from "@/components/portal/candidate-documents-manager"
import { loadCandidateDocuments } from "@/lib/candidateDocuments/loadDocuments"
import {
  saveCandidateDocumentVersion,
  archiveCandidateDocument,
} from "@/app/internal/candidates/documents-actions"

export const metadata: Metadata = { title: "Kandidat — Dafinex" }

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, phone, skills, region, availability, source_type, profile_id, availability_start, availability_end, max_workload_percent, certifications, languages, experience_years, preferred_regions"
    )
    .eq("id", id)
    .single()

  if (candidateError && candidateError.code !== "PGRST116") {
    console.error("Kandidat konnte nicht geladen werden:", candidateError)
  }

  if (!candidate) {
    notFound()
  }

  const documents = await loadCandidateDocuments(candidate.id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold">
          {candidate.first_name} {candidate.last_name}
        </h1>
        <CandidateDetailActions
          candidate={{
            id: candidate.id,
            firstName: candidate.first_name,
            lastName: candidate.last_name,
            skills: candidate.skills ?? [],
            region: candidate.region,
            availability: candidate.availability,
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Region</p>
            <p>{candidate.region || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Verfügbarkeit</p>
            <p>{candidate.availability || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Fähigkeiten</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {candidate.skills && candidate.skills.length > 0 ? (
                candidate.skills.map((s: string) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Herkunft</p>
            <p>{candidate.profile_id ? "Selbst registriert" : "Intern erfasst"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selbstpflege (vom Kandidaten selbst gepflegt)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Telefonnummer</p>
            <p>{candidate.phone || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pensum</p>
            <p>{candidate.max_workload_percent != null ? `${candidate.max_workload_percent}%` : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Verfügbar von / bis</p>
            <p>
              {candidate.availability_start || "—"}
              {candidate.availability_end ? ` – ${candidate.availability_end}` : ""}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Berufserfahrung</p>
            <p>{candidate.experience_years != null ? `${candidate.experience_years} Jahre` : "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Zertifikate (Selbstangabe — Nachweisdokumente siehe Abschnitt Dokumente unten)</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {candidate.certifications && candidate.certifications.length > 0 ? (
                candidate.certifications.map((c: string) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Sprachen</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {candidate.languages && candidate.languages.length > 0 ? (
                candidate.languages.map((l: string) => (
                  <Badge key={l} variant="secondary">
                    {l}
                  </Badge>
                ))
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Bevorzugte Regionen</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {candidate.preferred_regions && candidate.preferred_regions.length > 0 ? (
                candidate.preferred_regions.map((r: string) => (
                  <Badge key={r} variant="secondary">
                    {r}
                  </Badge>
                ))
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CandidateDocumentsManager
        candidateId={candidate.id}
        cv={documents.cv}
        workPermit={documents.workPermit}
        certificates={documents.certificates}
        archivedDocuments={documents.archivedDocuments}
        onSave={(input) => saveCandidateDocumentVersion(candidate.id, input)}
        onArchive={(documentId) => archiveCandidateDocument(candidate.id, documentId)}
      />
    </div>
  )
}
