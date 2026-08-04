import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PartnerCandidateFormDialog } from "@/components/portal/partner-candidate-form-dialog"
import { PartnerCandidatesTable, type PartnerCandidateRow } from "@/components/portal/partner-candidates-table"

export const metadata: Metadata = { title: "Kandidaten — Dafinex" }

export default async function PartnerCandidatesPage() {
  const supabase = await createClient()

  // RLS (candidates_select_own_partner) already scopes this to the caller's
  // own firm — no explicit .eq("partner_company_id", ...) needed here.
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, first_name, last_name, skills, region, availability")
    .order("last_name", { ascending: true })

  const rows: PartnerCandidateRow[] = (candidates ?? []).map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    skills: c.skills ?? [],
    region: c.region,
    availability: c.availability,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kandidaten</h1>
        <PartnerCandidateFormDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Kandidat
            </Button>
          }
        />
      </div>
      <PartnerCandidatesTable candidates={rows} />
    </div>
  )
}
