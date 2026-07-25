import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PersonnelRequestFormDialog } from "@/components/portal/personnel-request-form-dialog"
import {
  MunicipalityRequestsTable,
  type MunicipalityRequestRow,
} from "@/components/portal/municipality-requests-table"

export const metadata: Metadata = { title: "Personalanfragen — Dafinex" }

export default async function MunicipalityRequestsPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: requests } = await supabase
    .from("personnel_requests")
    .select("id, title, required_skills, region, start_date, end_date, status")
    .eq("municipality_id", profile?.municipalityId ?? "")
    .order("created_date", { ascending: false })

  const rows: MunicipalityRequestRow[] = (requests ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    requiredSkills: r.required_skills ?? [],
    region: r.region,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Personalanfragen</h1>
        <PersonnelRequestFormDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neue Anfrage
            </Button>
          }
        />
      </div>
      <MunicipalityRequestsTable requests={rows} />
    </div>
  )
}
