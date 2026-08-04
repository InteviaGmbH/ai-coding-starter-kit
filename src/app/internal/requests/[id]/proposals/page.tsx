import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProposalsTable, type ProposalRow } from "@/components/portal/proposals-table"

export const metadata: Metadata = { title: "Vorschläge — Dafinex" }

export default async function RequestProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, title, start_date, end_date")
    .eq("id", id)
    .single()

  if (!request) {
    notFound()
  }

  const { data: proposals } = await supabase
    .from("candidate_proposals")
    .select(
      "id, status, created_date, proposed_by_id, candidate:candidates(id, first_name, last_name)",
    )
    .eq("request_id", id)
    .order("created_date", { ascending: false })

  const proposerIds = Array.from(
    new Set((proposals ?? []).map((p) => p.proposed_by_id).filter((v): v is string => !!v)),
  )

  const { data: proposers } =
    proposerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, email, role, partner_company_id")
          .in("id", proposerIds)
      : { data: [] }

  const proposerNameById = new Map(
    (proposers ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  )

  const partnerCompanyIds = Array.from(
    new Set(
      (proposers ?? [])
        .filter((p) => p.role === "partner_company" && p.partner_company_id)
        .map((p) => p.partner_company_id as string),
    ),
  )

  const { data: partnerCompanies } =
    partnerCompanyIds.length > 0
      ? await supabase.from("partner_companies").select("id, name").in("id", partnerCompanyIds)
      : { data: [] }

  const partnerCompanyNameById = new Map((partnerCompanies ?? []).map((c) => [c.id, c.name]))
  const proposerPartnerCompanyId = new Map(
    (proposers ?? []).map((p) => [p.id, p.role === "partner_company" ? p.partner_company_id : null]),
  )

  const proposalIds = (proposals ?? []).map((p) => p.id)
  const { data: assignments } =
    proposalIds.length > 0
      ? await supabase.from("assignments").select("id, proposal_id").in("proposal_id", proposalIds)
      : { data: [] }

  const assignmentIdByProposalId = new Map((assignments ?? []).map((a) => [a.proposal_id, a.id]))

  const rows: ProposalRow[] = (proposals ?? []).map((p) => {
    const candidate = Array.isArray(p.candidate) ? p.candidate[0] : p.candidate
    return {
      id: p.id,
      status: p.status as "proposed" | "approved" | "rejected" | "municipality_accepted" | "municipality_declined",
      createdDate: p.created_date,
      candidateId: candidate?.id ?? "",
      candidateName: candidate ? `${candidate.first_name} ${candidate.last_name}` : "Unbekannt",
      proposedByName: p.proposed_by_id ? (proposerNameById.get(p.proposed_by_id) ?? "—") : "—",
      partnerCompanyName: p.proposed_by_id
        ? (partnerCompanyNameById.get(proposerPartnerCompanyId.get(p.proposed_by_id) ?? "") ?? null)
        : null,
      assignmentId: assignmentIdByProposalId.get(p.id) ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/internal/requests/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Zurück zur Anfrage
        </Link>
        <h1 className="text-2xl font-semibold">Vorschläge: {request.title}</h1>
      </div>
      <ProposalsTable
        proposals={rows}
        defaultStartDate={request.start_date}
        defaultEndDate={request.end_date}
      />
    </div>
  )
}
