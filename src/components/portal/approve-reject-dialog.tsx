"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { PendingAccount } from "@/components/portal/pending-accounts-table"
import {
  approveCandidateAccount,
  approveMunicipalityAccount,
  rejectAccount,
} from "@/app/internal/approvals/actions"

interface Municipality {
  id: string
  name: string
}

interface ApproveRejectDialogProps {
  account: PendingAccount
  municipalities: Municipality[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApproveRejectDialog({
  account,
  municipalities,
  open,
  onOpenChange,
}: ApproveRejectDialogProps) {
  const router = useRouter()
  const [municipalityId, setMunicipalityId] = useState<string>("")
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setError(null)
    setLoading("approve")

    const result =
      account.role === "municipality"
        ? await approveMunicipalityAccount(account.id, municipalityId)
        : await approveCandidateAccount(account.id)

    setLoading(null)

    if (!result.success) {
      setError(result.error ?? "Freischaltung fehlgeschlagen.")
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  async function handleReject() {
    setError(null)
    setLoading("reject")

    const result = await rejectAccount(account.id)

    setLoading(null)

    if (!result.success) {
      setError(result.error ?? "Ablehnung fehlgeschlagen.")
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account.fullName ?? account.email}</DialogTitle>
          <DialogDescription>
            Registriert als {account.role === "municipality" ? "Gemeinde-Ansprechpartner" : "Kandidat"} ·{" "}
            {account.email}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {account.role === "candidate" && account.candidate && (
          <div className="space-y-1 rounded-md border p-3 text-sm">
            <p>
              <span className="font-medium">Fähigkeiten:</span>{" "}
              {account.candidate.skills.join(", ") || "—"}
            </p>
            <p>
              <span className="font-medium">Region:</span> {account.candidate.region || "—"}
            </p>
            <p>
              <span className="font-medium">Verfügbarkeit:</span>{" "}
              {account.candidate.availability || "—"}
            </p>
            {account.candidate.hasCv && (
              <p className="text-muted-foreground">Dokument hochgeladen</p>
            )}
          </div>
        )}

        {account.role === "municipality" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Gemeinde zuordnen</label>
            <Select value={municipalityId} onValueChange={setMunicipalityId}>
              <SelectTrigger>
                <SelectValue placeholder="Gemeinde auswählen" />
              </SelectTrigger>
              <SelectContent>
                {municipalities.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {municipalities.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Es existiert noch keine Gemeinde. Bitte zuerst eine Gemeinde anlegen.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="destructive" onClick={handleReject} disabled={loading !== null}>
            {loading === "reject" ? "Wird abgelehnt…" : "Ablehnen"}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={
              loading !== null || (account.role === "municipality" && !municipalityId)
            }
          >
            {loading === "approve" ? "Wird freigeschaltet…" : "Freischalten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
