import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = { title: "Dashboard — Dafinex" }

export default function MunicipalityDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Willkommen</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Das Erstellen und Verfolgen von Personalanfragen folgt in einem der nächsten
          Ausbauschritte (PROJ-5).
        </CardContent>
      </Card>
    </div>
  )
}
