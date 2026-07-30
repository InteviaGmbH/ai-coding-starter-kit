import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  CandidateMatchingPanel,
  type MatchingCandidateSource,
} from "@/components/portal/candidate-matching-panel"

export const metadata: Metadata = { title: "Kandidaten suchen — Dafinex" }

export default async function RequestCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: request, error: requestError } = await supabase
    .from("personnel_requests")
    .select("id, title, required_skills, region, start_date, end_date, required_workload_percent, status")
    .eq("id", id)
    .single()

  if (requestError && requestError.code !== "PGRST116") {
    console.error("Anfrage konnte nicht geladen werden:", requestError)
  }

  if (!request) {
    notFound()
  }

  // PROJ-14: no more hard skills/region exclusion — every candidate with an
  // active or no login account is shown, scored and sorted by match quality
  // instead of being filtered out entirely.
  const { data: candidates, error: candidatesError } = await supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, skills, region, availability, availability_start, availability_end, max_workload_percent, profile_id"
    )
    .order("last_name", { ascending: true })

  if (candidatesError) {
    console.error("Kandidaten konnten nicht geladen werden:", candidatesError)
  }

  const profileIds = (candidates ?? [])
    .map((c) => c.profile_id)
    .filter((id): id is string => id !== null)

  const { data: profiles, error: profilesError } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, account_status").in("id", profileIds)
      : { data: [], error: null }

  if (profilesError) {
    console.error("Kontostatus der Kandidaten konnte nicht geladen werden:", profilesError)
  }

  const statusByProfileId = new Map((profiles ?? []).map((p) => [p.id, p.account_status]))

  const { data: openProposals, error: proposalsError } = await supabase
    .from("candidate_proposals")
    .select("candidate_id")
    .eq("request_id", id)
    .eq("status", "proposed")

  if (proposalsError) {
    console.error("Offene Vorschläge konnten nicht geladen werden:", proposalsError)
  }

  const alreadyProposedIds = new Set((openProposals ?? []).map((p) => p.candidate_id))

  const matchingCandidates: MatchingCandidateSource[] = (candidates ?? [])
    .filter((c) => {
      if (!c.profile_id) return true // internally entered, always eligible
      return statusByProfileId.get(c.profile_id) === "active"
    })
    .map((c) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      skills: c.skills ?? [],
      region: c.region,
      availability: c.availability,
      availabilityStart: c.availability_start,
      availabilityEnd: c.availability_end,
      maxWorkloadPercent: c.max_workload_percent,
      alreadyProposed: alreadyProposedIds.has(c.id),
    }))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/internal/requests/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Zurück zur Anfrage
        </Link>
        <h1 className="text-2xl font-semibold">Kandidaten suchen: {request.title}</h1>
      </div>
      <CandidateMatchingPanel
        requestId={id}
        requestReviewed={request.status === "reviewed"}
        initialSkills={request.required_skills ?? []}
        initialRegion={request.region ?? ""}
        requestStartDate={request.start_date}
        requestEndDate={request.end_date}
        requestRequiredWorkloadPercent={request.required_workload_percent}
        candidates={matchingCandidates}
      />
    </div>
  )
}
