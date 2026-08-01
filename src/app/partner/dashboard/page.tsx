import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Dashboard — Dafinex" }

export default function PartnerDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Partnerportal kommt bald</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Das Partnerportal für Partnerfirmen-Kandidatenvorschläge ist in Vorbereitung und noch
            nicht verfügbar. Bitte wende dich bei Fragen an Dafinex.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
