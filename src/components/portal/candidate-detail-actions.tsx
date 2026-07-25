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
import { CandidateFormDialog } from "@/components/portal/candidate-form-dialog"
import { deleteCandidate } from "@/app/internal/candidates/actions"

interface Props {
  candidate: {
    id: string
    firstName: string
    lastName: string
    skills: string[]
    region: string | null
    availability: string | null
  }
}

export function CandidateDetailActions({ candidate }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const result = await deleteCandidate(candidate.id)
    setDeleting(false)

    if (!result.success) {
      setError(result.error ?? "Löschen fehlgeschlagen.")
      return
    }

    router.push("/internal/candidates")
  }

  return (
    <div className="flex gap-2">
      <CandidateFormDialog
        mode="edit"
        candidateId={candidate.id}
        defaultValues={{
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          skills: candidate.skills.join(", "),
          region: candidate.region ?? "",
          availability: candidate.availability ?? "",
        }}
        trigger={<Button variant="outline">Bearbeiten</Button>}
      />
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Löschen
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kandidat löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{candidate.firstName} {candidate.lastName}" wirklich löschen? Dies kann
              nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Wird gelöscht…" : "Löschen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
