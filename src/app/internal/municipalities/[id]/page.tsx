import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MunicipalityDetailActions } from "@/components/portal/municipality-detail-actions"
import { MessageThread } from "@/components/portal/message-thread"
import { loadMessageThread } from "@/lib/messages/loadThread"
import { sendInternalMessage } from "@/app/internal/messages/actions"

export const metadata: Metadata = { title: "Gemeinde — Dafinex" }

const statusLabel: Record<string, string> = {
  pending: "Ausstehend",
  active: "Aktiv",
  rejected: "Abgelehnt",
}

export default async function MunicipalityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: municipality } = await supabase
    .from("municipalities")
    .select("id, name, address, contact_name, contact_email, contact_phone")
    .eq("id", id)
    .single()

  if (!municipality) {
    notFound()
  }

  const { data: contacts } = await supabase
    .from("profiles")
    .select("id, full_name, email, account_status")
    .eq("municipality_id", id)
    .order("created_date", { ascending: true })

  const thread = await loadMessageThread(
    { messageType: "general_municipality", municipalityId: municipality.id },
    true
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold">{municipality.name}</h1>
        <MunicipalityDetailActions
          municipality={{
            id: municipality.id,
            name: municipality.name,
            address: municipality.address,
            contactName: municipality.contact_name,
            contactEmail: municipality.contact_email,
            contactPhone: municipality.contact_phone,
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
            <p>{municipality.address || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ansprechpartner</p>
            <p>{municipality.contact_name || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kontakt-E-Mail</p>
            <p>{municipality.contact_email || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Telefon</p>
            <p>{municipality.contact_phone || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verknüpfte Ansprechpartner-Konten</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts && contacts.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{c.full_name ?? "—"}</p>
                    <p className="text-muted-foreground">{c.email}</p>
                  </div>
                  <Badge variant={c.account_status === "active" ? "default" : "secondary"}>
                    {statusLabel[c.account_status] ?? c.account_status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch kein Ansprechpartner-Konto mit dieser Gemeinde verknüpft.
            </p>
          )}
        </CardContent>
      </Card>

      <MessageThread
        title="Allgemeine Nachrichten"
        messages={thread.messages}
        subject={thread.subject}
        viewerIsInternal={true}
        counterpartLabel="Gemeinde"
        onSend={(input) =>
          sendInternalMessage(
            { messageType: "general_municipality", municipalityId: municipality.id },
            input
          )
        }
      />
    </div>
  )
}
