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
    .select("id, first_name, last_name, skills, region, availability, source_type, profile_id")
    .order("last_name", { ascending: true })

  const rows: CandidateRow[] = (candidates ?? []).map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    skills: c.skills ?? [],
    region: c.region,
    availability: c.availability,
    sourceType: c.source_type,
    hasAccount: c.profile_id !== null,
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
