import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PartnerCompanyDetailActions } from "@/components/portal/partner-company-detail-actions"

export const metadata: Metadata = { title: "Partnerfirma — Dafinex" }

const statusLabel: Record<string, string> = {
  pending: "Ausstehend",
  active: "Aktiv",
  rejected: "Abgelehnt",
}

export default async function PartnerCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: company } = await supabase
    .from("partner_companies")
    .select("id, name, address, contact_name, contact_email, contact_phone, commission_rate")
    .eq("id", id)
    .single()

  if (!company) {
    notFound()
  }

  const { data: accounts } = await supabase
    .from("profiles")
    .select("id, full_name, email, account_status")
    .eq("partner_company_id", id)
    .order("created_date", { ascending: true })

  const { count: candidateCount } = await supabase
    .from("candidates")
    .select("id", { count: "exact", head: true })
    .eq("partner_company_id", id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <PartnerCompanyDetailActions
          company={{
            id: company.id,
            name: company.name,
            address: company.address,
            contactName: company.contact_name,
            contactEmail: company.contact_email,
            contactPhone: company.contact_phone,
            commissionRate: company.commission_rate,
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Adresse</p>
            <p>{company.address || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ansprechpartner</p>
            <p>{company.contact_name || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kontakt-E-Mail</p>
            <p>{company.contact_email || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Telefon</p>
            <p>{company.contact_phone || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Provision</p>
            <p>{company.commission_rate != null ? `${company.commission_rate}%` : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Eigene Kandidaten</p>
            <p>{candidateCount ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verknüpfte Nutzerkonten</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts && accounts.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{a.full_name ?? "—"}</p>
                    <p className="text-muted-foreground">{a.email}</p>
                  </div>
                  <Badge variant={a.account_status === "active" ? "default" : "secondary"}>
                    {statusLabel[a.account_status] ?? a.account_status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch kein Nutzerkonto mit dieser Partnerfirma verknüpft.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
