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
import { MunicipalityFormDialog } from "@/components/portal/municipality-form-dialog"
import { deleteMunicipality } from "@/app/internal/municipalities/actions"

interface Props {
  municipality: {
    id: string
    name: string
    address: string | null
    contactName: string | null
    contactEmail: string | null
    contactPhone: string | null
  }
}

export function MunicipalityDetailActions({ municipality }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const result = await deleteMunicipality(municipality.id)
    setDeleting(false)

    if (!result.success) {
      setError(result.error ?? "Löschen fehlgeschlagen.")
      return
    }

    router.push("/internal/municipalities")
  }

  return (
    <div className="flex gap-2">
      <MunicipalityFormDialog
        mode="edit"
        municipalityId={municipality.id}
        defaultValues={{
          name: municipality.name,
          address: municipality.address ?? "",
          contactName: municipality.contactName ?? "",
          contactEmail: municipality.contactEmail ?? "",
          contactPhone: municipality.contactPhone ?? "",
        }}
        trigger={<Button variant="outline">Bearbeiten</Button>}
      />
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Löschen
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gemeinde löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{municipality.name}" wirklich löschen? Dies kann nicht rückgängig
              gemacht werden.
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
