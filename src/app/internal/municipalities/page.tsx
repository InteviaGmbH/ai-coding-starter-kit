import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { MunicipalityFormDialog } from "@/components/portal/municipality-form-dialog"
import { MunicipalitiesTable, type MunicipalityRow } from "@/components/portal/municipalities-table"

export const metadata: Metadata = { title: "Gemeinden — Dafinex" }

export default async function MunicipalitiesPage() {
  const supabase = await createClient()

  const { data: municipalities } = await supabase
    .from("municipalities")
    .select("id, name, address, contact_name, contact_email, contact_phone")
    .order("name", { ascending: true })

  const rows: MunicipalityRow[] = await Promise.all(
    (municipalities ?? []).map(async (m) => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("municipality_id", m.id)
        .eq("account_status", "active")

      return {
        id: m.id,
        name: m.name,
        address: m.address,
        contactName: m.contact_name,
        contactEmail: m.contact_email,
        contactPhone: m.contact_phone,
        activeContactCount: count ?? 0,
      }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gemeinden</h1>
        <MunicipalityFormDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neue Gemeinde
            </Button>
          }
        />
      </div>
      <MunicipalitiesTable municipalities={rows} />
    </div>
  )
}
