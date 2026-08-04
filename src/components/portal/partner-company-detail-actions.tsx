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
import { PartnerCompanyFormDialog } from "@/components/portal/partner-company-form-dialog"
import { deletePartnerCompany } from "@/app/internal/partners/actions"

interface Props {
  company: {
    id: string
    name: string
    address: string | null
    contactName: string | null
    contactEmail: string | null
    contactPhone: string | null
    commissionRate: number | null
  }
}

export function PartnerCompanyDetailActions({ company }: Props) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const result = await deletePartnerCompany(company.id)
    setDeleting(false)

    if (!result.success) {
      setError(result.error ?? "Löschen fehlgeschlagen.")
      return
    }

    router.push("/internal/partners")
  }

  return (
    <div className="flex gap-2">
      <PartnerCompanyFormDialog
        mode="edit"
        partnerCompanyId={company.id}
        defaultValues={{
          name: company.name,
          address: company.address ?? "",
          contactName: company.contactName ?? "",
          contactEmail: company.contactEmail ?? "",
          contactPhone: company.contactPhone ?? "",
          commissionRate: company.commissionRate != null ? String(company.commissionRate) : "",
        }}
        trigger={<Button variant="outline">Bearbeiten</Button>}
      />
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Löschen
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partnerfirma löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{company.name}" wirklich löschen? Dies kann nicht rückgängig gemacht
              werden.
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
