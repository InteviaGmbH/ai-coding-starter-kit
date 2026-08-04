import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PartnerCompanyFormDialog } from "@/components/portal/partner-company-form-dialog"
import { PartnerCompaniesTable, type PartnerCompanyRow } from "@/components/portal/partner-companies-table"

export const metadata: Metadata = { title: "Partnerfirmen — Dafinex" }

export default async function PartnersPage() {
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from("partner_companies")
    .select("id, name, address, contact_name, contact_email, contact_phone, commission_rate")
    .order("name", { ascending: true })

  const rows: PartnerCompanyRow[] = await Promise.all(
    (companies ?? []).map(async (c) => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("partner_company_id", c.id)
        .eq("account_status", "active")

      return {
        id: c.id,
        name: c.name,
        address: c.address,
        contactName: c.contact_name,
        contactEmail: c.contact_email,
        contactPhone: c.contact_phone,
        // numeric(5,2) comes back from PostgREST as a string, not a number
        // (BUG-13-2) — normalize at the read boundary so downstream code can
        // rely on the `number | null` type it already declares.
        commissionRate: c.commission_rate == null ? null : Number(c.commission_rate),
        activeAccountCount: count ?? 0,
      }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Partnerfirmen</h1>
        <PartnerCompanyFormDialog
          mode="create"
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neue Partnerfirma
            </Button>
          }
        />
      </div>
      <PartnerCompaniesTable companies={rows} />
    </div>
  )
}
