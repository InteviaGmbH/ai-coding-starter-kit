import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  MunicipalityProposalsTable,
  type MunicipalityProposalRow,
} from "@/components/portal/municipality-proposals-table"

export const metadata: Metadata = { title: "Vorschläge — Dafinex" }

export default async function MunicipalityRequestProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, title")
    .eq("id", id)
    .single()

  if (!request) {
    notFound()
  }

  // RLS already excludes 'proposed'/'rejected' proposals for this role — see
  // candidate_proposals_select (PROJ-8 migration). No extra status filter
  // needed here.
  const { data: proposals } = await supabase
    .from("candidate_proposals")
    .select(
      "id, status, created_date, candidate:candidates(id, first_name, last_name, skills, region, availability)",
    )
    .eq("request_id", id)
    .order("created_date", { ascending: false })

  const rows: MunicipalityProposalRow[] = (proposals ?? []).map((p) => {
    const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate
    return {
      id: p.id,
      status: p.status as "approved" | "municipality_accepted" | "municipality_declined",
      firstName: candidate?.first_name ?? "Unbekannt",
      lastName: candidate?.last_name ?? "",
      skills: candidate?.skills ?? [],
      region: candidate?.region ?? null,
      availability: candidate?.availability ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/municipality/requests/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Zurück zur Anfrage
        </Link>
        <h1 className="text-2xl font-semibold">Vorschläge: {request.title}</h1>
      </div>
      <MunicipalityProposalsTable proposals={rows} />
    </div>
  )
}
