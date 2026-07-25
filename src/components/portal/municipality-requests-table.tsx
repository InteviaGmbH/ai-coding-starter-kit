"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PersonnelRequestFormDialog } from "@/components/portal/personnel-request-form-dialog"
import { withdrawPersonnelRequest } from "@/app/municipality/requests/actions"

export interface MunicipalityRequestRow {
  id: string
  title: string
  requiredSkills: string[]
  region: string | null
  startDate: string
  endDate: string | null
  status: "created" | "reviewed"
}

const statusLabel: Record<string, string> = { created: "Erstellt", reviewed: "Geprüft" }

export function MunicipalityRequestsTable({ requests }: { requests: MunicipalityRequestRow[] }) {
  const router = useRouter()
  const [pendingWithdraw, setPendingWithdraw] = useState<MunicipalityRequestRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleWithdraw() {
    if (!pendingWithdraw) return
    setLoading(true)
    setError(null)

    const result = await withdrawPersonnelRequest(pendingWithdraw.id)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Zurückziehen fehlgeschlagen.")
      return
    }

    setPendingWithdraw(null)
    router.refresh()
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Anfragen erstellt.
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead>
            <TableHead>Zeitraum</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => {
            const editable = r.status === "created"
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/municipality/requests/${r.id}`} className="font-medium hover:underline">
                    {r.title}
                  </Link>
                </TableCell>
                <TableCell>
                  {r.startDate}
                  {r.endDate ? ` – ${r.endDate}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "reviewed" ? "default" : "secondary"}>
                    {statusLabel[r.status]}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <PersonnelRequestFormDialog
                    mode="edit"
                    requestId={r.id}
                    defaultValues={{
                      title: r.title,
                      requiredSkills: r.requiredSkills.join(", "),
                      region: r.region ?? "",
                      startDate: r.startDate,
                      endDate: r.endDate ?? "",
                    }}
                    trigger={
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!editable}
                        title={editable ? undefined : "Bereits geprüfte Anfragen können nicht mehr bearbeitet werden"}
                      >
                        Bearbeiten
                      </Button>
                    }
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!editable}
                    title={editable ? undefined : "Bereits geprüfte Anfragen können nicht mehr zurückgezogen werden"}
                    onClick={() => setPendingWithdraw(r)}
                  >
                    Zurückziehen
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!pendingWithdraw} onOpenChange={(open) => !open && setPendingWithdraw(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anfrage zurückziehen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{pendingWithdraw?.title}" wirklich zurückziehen? Dies kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
            <Button variant="destructive" onClick={handleWithdraw} disabled={loading}>
              {loading ? "Wird zurückgezogen…" : "Zurückziehen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
