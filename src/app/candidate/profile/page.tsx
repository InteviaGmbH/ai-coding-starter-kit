import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { CandidateContactCard } from "@/components/portal/candidate-contact-card"
import { CandidateAvailabilityCard } from "@/components/portal/candidate-availability-card"
import { CandidateQualificationsCard } from "@/components/portal/candidate-qualifications-card"
import { CandidateDocumentsManager } from "@/components/portal/candidate-documents-manager"
import { loadCandidateDocuments } from "@/lib/candidateDocuments/loadDocuments"
import { saveOwnCandidateDocumentVersion, archiveOwnCandidateDocument } from "@/app/candidate/documents/actions"

export const metadata: Metadata = { title: "Profil — Dafinex" }

export default async function CandidateProfilePage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, phone, skills, certifications, languages, experience_years, preferred_regions, availability_start, availability_end, max_workload_percent"
    )
    .eq("id", profile?.candidateId ?? "")
    .maybeSingle()

  if (candidateError) {
    console.error("Kandidatenprofil konnte nicht geladen werden:", candidateError)
  }

  if (!candidate) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          Dein Kandidatenprofil konnte nicht geladen werden. Bitte kontaktiere Dafinex.
        </p>
      </div>
    )
  }

  const documents = await loadCandidateDocuments(candidate.id)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profil</h1>

      <CandidateContactCard
        email={profile?.email ?? ""}
        defaultValues={{
          firstName: candidate.first_name,
          lastName: candidate.last_name,
          phone: candidate.phone ?? "",
        }}
      />

      <CandidateAvailabilityCard
        defaultValues={{
          maxWorkloadPercent: candidate.max_workload_percent?.toString() ?? "",
          availabilityStart: candidate.availability_start ?? "",
          availabilityEnd: candidate.availability_end ?? "",
        }}
      />

      <CandidateQualificationsCard
        defaultValues={{
          skills: candidate.skills?.join(", ") ?? "",
          certifications: candidate.certifications?.join(", ") ?? "",
          languages: candidate.languages?.join(", ") ?? "",
          experienceYears: candidate.experience_years?.toString() ?? "",
          preferredRegions: candidate.preferred_regions?.join(", ") ?? "",
        }}
      />

      <CandidateDocumentsManager
        candidateId={candidate.id}
        cv={documents.cv}
        workPermit={documents.workPermit}
        certificates={documents.certificates}
        archivedDocuments={documents.archivedDocuments}
        onSave={saveOwnCandidateDocumentVersion}
        onArchive={archiveOwnCandidateDocument}
      />
    </div>
  )
}
