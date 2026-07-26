"use client"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { acceptProposal, declineProposal } from "@/app/municipality/requests/[id]/proposals/actions"

export interface MunicipalityProposalRow {
  id: string
  status: "approved" | "municipality_accepted" | "municipality_declined"
  firstName: string
  lastName: string
  skills: string[]
  region: string | null
  availability: string | null
}

const statusLabel: Record<MunicipalityProposalRow["status"], string> = {
  approved: "Freigegeben",
  municipality_accepted: "Angenommen",
  municipality_declined: "Abgelehnt",
}

const statusVariant: Record<MunicipalityProposalRow["status"], "default" | "secondary" | "destructive"> = {
  approved: "secondary",
  municipality_accepted: "default",
  municipality_declined: "destructive",
}

export function MunicipalityProposalsTable({ proposals }: { proposals: MunicipalityProposalRow[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [declineId, setDeclineId] = useState<string | null>(null)

  async function handleAccept(proposalId: string) {
    setLoadingId(proposalId)
    setError(null)
    const result = await acceptProposal(proposalId)
    setLoadingId(null)

    if (!result.success) {
      setError(result.error ?? "Aktion fehlgeschlagen.")
      return
    }
    router.refresh()
  }

  async function handleDecline() {
    if (!declineId) return
    setLoadingId(declineId)
    setError(null)
    const result = await declineProposal(declineId)
    setLoadingId(null)

    if (!result.success) {
      setError(result.error ?? "Aktion fehlgeschlagen.")
      return
    }
    setDeclineId(null)
    router.refresh()
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine freigegebenen Vorschläge für diese Anfrage.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Fähigkeiten</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Verfügbarkeit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                {p.firstName} {p.lastName}
              </TableCell>
              <TableCell className="max-w-xs truncate" title={p.skills.join(", ")}>
                {p.skills.join(", ") || "—"}
              </TableCell>
              <TableCell>{p.region ?? "—"}</TableCell>
              <TableCell>{p.availability ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  disabled={p.status !== "approved" || loadingId === p.id}
                  title={p.status !== "approved" ? "Über diesen Vorschlag wurde bereits entschieden." : undefined}
                  onClick={() => handleAccept(p.id)}
                >
                  Annehmen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={p.status !== "approved" || loadingId === p.id}
                  title={p.status !== "approved" ? "Über diesen Vorschlag wurde bereits entschieden." : undefined}
                  onClick={() => setDeclineId(p.id)}
                >
                  Ablehnen
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={declineId !== null} onOpenChange={(open) => !open && setDeclineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorschlag ablehnen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Entscheidung kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingId !== null}>Abbrechen</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDecline} disabled={loadingId !== null}>
              {loadingId ? "Wird abgelehnt…" : "Ablehnen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
