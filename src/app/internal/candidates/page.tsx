import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CandidateFormDialog } from "@/components/portal/candidate-form-dialog"
import { CandidatesTable, type CandidateRow } from "@/components/portal/candidates-table"

export const metadata: Metadata = { title: "Kandidaten — Dafinex" }

export default async function CandidatesPage() {
  const supabase = await createClient()

  const { data: candidates } = await supabase
    .from("candidates")
    .select(
      "id, first_name, last_name, skills, region, availability, source_type, profile_id, partner_company_id"
    )
    .order("last_name", { ascending: true })

  // Separate lookup instead of an implicit PostgREST embed — candidates has
  // more than one FK-adjacent relationship in play here (profile_id,
  // partner_company_id), see .claude/rules/backend.md.
  const partnerCompanyIds = Array.from(
    new Set((candidates ?? []).map((c) => c.partner_company_id).filter((v): v is string => !!v))
  )
  const { data: partnerCompanies } =
    partnerCompanyIds.length > 0
      ? await supabase.from("partner_companies").select("id, name").in("id", partnerCompanyIds)
      : { data: [] }
  const partnerCompanyNameById = new Map((partnerCompanies ?? []).map((p) => [p.id, p.name]))

  const rows: CandidateRow[] = (candidates ?? []).map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    skills: c.skills ?? [],
    region: c.region,
    availability: c.availability,
    sourceType: c.source_type,
    hasAccount: c.profile_id !== null,
    partnerCompanyName: c.partner_company_id
      ? (partnerCompanyNameById.get(c.partner_company_id) ?? null)
      : null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kandidaten</h1>
        <CandidateFormDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Kandidat
            </Button>
          }
        />
      </div>
      <CandidatesTable candidates={rows} />
    </div>
  )
}
