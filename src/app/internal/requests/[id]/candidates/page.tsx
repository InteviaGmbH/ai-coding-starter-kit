import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MatchFiltersBar } from "@/components/portal/match-filters-bar"
import {
  MatchingCandidatesTable,
  type MatchingCandidateRow,
} from "@/components/portal/matching-candidates-table"

export const metadata: Metadata = { title: "Kandidaten suchen — Dafinex" }

function parseListParam(value: string | string[] | undefined): string[] {
  if (!value) return []
  const raw = Array.isArray(value) ? value[0] : value
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export default async function RequestCandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ skills?: string; region?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, title, required_skills, region")
    .eq("id", id)
    .single()

  if (!request) {
    notFound()
  }

  // Filters default to the request's own criteria on first visit (no
  // searchParams yet), but once present, searchParams are the source of
  // truth — including an intentionally empty filter (user removed it).
  const hasFilterParams = sp.skills !== undefined || sp.region !== undefined
  const activeSkills: string[] = hasFilterParams
    ? parseListParam(sp.skills)
    : request.required_skills ?? []
  const activeRegion: string = hasFilterParams ? sp.region?.trim() ?? "" : request.region ?? ""

  let query = supabase
    .from("candidates")
    .select("id, first_name, last_name, skills, region, availability, profile_id")

  if (activeSkills.length > 0) {
    query = query.overlaps("skills", activeSkills)
  }
  if (activeRegion) {
    query = query.ilike("region", `%${activeRegion}%`)
  }

  const { data: candidates } = await query.order("last_name", { ascending: true })

  const profileIds = (candidates ?? [])
    .map((c) => c.profile_id)
    .filter((id): id is string => id !== null)

  const { data: profiles } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, account_status").in("id", profileIds)
      : { data: [] }

  const statusByProfileId = new Map((profiles ?? []).map((p) => [p.id, p.account_status]))

  const rows: MatchingCandidateRow[] = (candidates ?? [])
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
      <MatchFiltersBar requestId={id} initialSkills={activeSkills} initialRegion={activeRegion} />
      <MatchingCandidatesTable candidates={rows} />
    </div>
  )
}
