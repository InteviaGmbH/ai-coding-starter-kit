import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CandidateDetailActions } from "@/components/portal/candidate-detail-actions"
import { CandidateDocumentCard } from "@/components/portal/candidate-document-card"

export const metadata: Metadata = { title: "Kandidat — Dafinex" }

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidate } = await supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, skills, region, availability, source_type, cv_document_path, profile_id"
    )
    .eq("id", id)
    .single()

  if (!candidate) {
    notFound()
  }

  let downloadUrl: string | null = null
  if (candidate.cv_document_path) {
    const { data: signed } = await supabase.storage
      .from("candidate-documents")
      .createSignedUrl(candidate.cv_document_path, 300)
    downloadUrl = signed?.signedUrl ?? null
  }

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

      <CandidateDocumentCard
        candidateId={candidate.id}
        documentPath={candidate.cv_document_path}
        downloadUrl={downloadUrl}
      />
    </div>
  )
}
