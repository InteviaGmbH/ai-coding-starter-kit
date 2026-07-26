"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { proposeCandidate } from "@/app/internal/requests/[id]/proposals/actions"

interface Props {
  requestId: string
  candidateId: string
  candidateName: string
  disabled?: boolean
  disabledReason?: string
}

export function ProposeCandidateButton({
  requestId,
  candidateId,
  candidateName,
  disabled,
  disabledReason,
}: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const result = await proposeCandidate(requestId, candidateId)
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Vorschlag fehlgeschlagen.")
      return
    }

    setConfirmOpen(false)
    router.push(`/internal/requests/${requestId}/proposals`)
  }

  return (
    <>
      <Button
        size="sm"
        disabled={disabled}
        title={disabledReason}
        onClick={() => setConfirmOpen(true)}
      >
        Kandidat vorschlagen
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kandidat vorschlagen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{candidateName}" für diese Anfrage vorschlagen? Der Vorschlag wird
              anschliessend intern zur Freigabe angezeigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? "Wird vorgeschlagen…" : "Vorschlagen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
