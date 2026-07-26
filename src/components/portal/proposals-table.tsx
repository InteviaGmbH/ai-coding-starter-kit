"use client"

import { useState } from "react"
import Link from "next/link"
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
import { reviewProposal, withdrawProposal } from "@/app/internal/requests/[id]/proposals/actions"

export interface ProposalRow {
  id: string
  status: "proposed" | "approved" | "rejected" | "municipality_accepted" | "municipality_declined"
  createdDate: string
  candidateId: string
  candidateName: string
  proposedByName: string
}

const statusLabel: Record<ProposalRow["status"], string> = {
  proposed: "Vorgeschlagen",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  municipality_accepted: "Von Gemeinde angenommen",
  municipality_declined: "Von Gemeinde abgelehnt",
}

const statusVariant: Record<ProposalRow["status"], "default" | "secondary" | "destructive"> = {
  proposed: "secondary",
  approved: "default",
  rejected: "destructive",
  municipality_accepted: "default",
  municipality_declined: "destructive",
}

export function ProposalsTable({ proposals }: { proposals: ProposalRow[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [withdrawId, setWithdrawId] = useState<string | null>(null)

  async function handleDecision(proposalId: string, decision: "approved" | "rejected") {
    setLoadingId(proposalId)
    setError(null)
    const result = await reviewProposal(proposalId, decision)
    setLoadingId(null)

    if (!result.success) {
      setError(result.error ?? "Aktion fehlgeschlagen.")
      return
    }
    router.refresh()
  }

  async function handleWithdraw() {
    if (!withdrawId) return
    setLoadingId(withdrawId)
    setError(null)
    const result = await withdrawProposal(withdrawId)
    setLoadingId(null)

    if (!result.success) {
      setError(result.error ?? "Zurückziehen fehlgeschlagen.")
      return
    }
    setWithdrawId(null)
    router.refresh()
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Vorschläge für diese Anfrage.
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
            <TableHead>Kandidat</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Vorgeschlagen von</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/internal/candidates/${p.candidateId}`}
                  className="font-medium hover:underline"
                >
                  {p.candidateName}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge>
              </TableCell>
              <TableCell>{p.proposedByName}</TableCell>
              <TableCell>{new Date(p.createdDate).toLocaleDateString("de-CH")}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  disabled={p.status !== "proposed" || loadingId === p.id}
                  title={p.status !== "proposed" ? "Über diesen Vorschlag wurde bereits entschieden." : undefined}
                  onClick={() => handleDecision(p.id, "approved")}
                >
                  Freigeben
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={p.status !== "proposed" || loadingId === p.id}
                  title={p.status !== "proposed" ? "Über diesen Vorschlag wurde bereits entschieden." : undefined}
                  onClick={() => handleDecision(p.id, "rejected")}
                >
                  Ablehnen
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={p.status !== "proposed" || loadingId === p.id}
                  title={p.status !== "proposed" ? "Nur offene Vorschläge können zurückgezogen werden." : undefined}
                  onClick={() => setWithdrawId(p.id)}
                >
                  Zurückziehen
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={withdrawId !== null} onOpenChange={(open) => !open && setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorschlag zurückziehen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Vorschlag wird entfernt. Dies kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingId !== null}>Abbrechen</AlertDialogCancel>
            <Button variant="destructive" onClick={handleWithdraw} disabled={loadingId !== null}>
              {loadingId ? "Wird zurückgezogen…" : "Zurückziehen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
