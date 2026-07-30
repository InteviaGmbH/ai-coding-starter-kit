import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { PendingAccountsTable, type PendingAccount } from "@/components/portal/pending-accounts-table"

export const metadata: Metadata = { title: "Freischaltungen — Dafinex" }

export default async function ApprovalsPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_date")
    .eq("account_status", "pending")
    .order("created_date", { ascending: true })

  const { data: municipalities } = await supabase
    .from("municipalities")
    .select("id, name")
    .order("name", { ascending: true })

  const candidateProfileIds = (profiles ?? [])
    .filter((p) => p.role === "candidate")
    .map((p) => p.id)

  const { data: candidates } =
    candidateProfileIds.length > 0
      ? await supabase
          .from("candidates")
          .select("id, profile_id, skills, region, availability")
          .in("profile_id", candidateProfileIds)
      : { data: [] }

  const candidateIds = (candidates ?? []).map((c) => c.id)

  // PROJ-16: CVs live in candidate_documents now, not candidates.cv_document_path.
  const { data: cvDocuments } =
    candidateIds.length > 0
      ? await supabase
          .from("candidate_documents")
          .select("candidate_id")
          .eq("document_type", "cv")
          .eq("is_archived", false)
          .in("candidate_id", candidateIds)
      : { data: [] }

  const candidateIdsWithCv = new Set((cvDocuments ?? []).map((d) => d.candidate_id))

  const candidatesByProfileId = new Map(
    (candidates ?? []).map((c) => [c.profile_id, { ...c, hasCv: candidateIdsWithCv.has(c.id) }])
  )

  const accounts: PendingAccount[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    role: p.role as "municipality" | "candidate",
    createdDate: p.created_date,
    candidate: candidatesByProfileId.get(p.id) ?? null,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Freischaltungen</h1>
      <PendingAccountsTable accounts={accounts} municipalities={municipalities ?? []} />
    </div>
  )
}
