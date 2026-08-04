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
import { PartnerCompanyFormDialog } from "@/components/portal/partner-company-form-dialog"
import { deletePartnerCompany } from "@/app/internal/partners/actions"

export interface PartnerCompanyRow {
  id: string
  name: string
  address: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  commissionRate: number | null
  activeAccountCount: number
}

export function PartnerCompaniesTable({ companies }: { companies: PartnerCompanyRow[] }) {
  const router = useRouter()
  const [pendingDelete, setPendingDelete] = useState<PartnerCompanyRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)

    const result = await deletePartnerCompany(pendingDelete.id)

    setDeleting(false)

    if (!result.success) {
      setDeleteError(result.error ?? "Löschen fehlgeschlagen.")
      return
    }

    setPendingDelete(null)
    router.refresh()
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Partnerfirmen erfasst.
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Adresse</TableHead>
            <TableHead>Provision</TableHead>
            <TableHead>Aktive Konten</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link href={`/internal/partners/${c.id}`} className="font-medium hover:underline">
                  {c.name}
                </Link>
              </TableCell>
              <TableCell className="max-w-xs truncate" title={c.address ?? undefined}>
                {c.address ?? "—"}
              </TableCell>
              <TableCell>{c.commissionRate != null ? `${c.commissionRate}%` : "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{c.activeAccountCount}</Badge>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <PartnerCompanyFormDialog
                  mode="edit"
                  partnerCompanyId={c.id}
                  defaultValues={{
                    name: c.name,
                    address: c.address ?? "",
                    contactName: c.contactName ?? "",
                    contactEmail: c.contactEmail ?? "",
                    contactPhone: c.contactPhone ?? "",
                    commissionRate: c.commissionRate != null ? String(c.commissionRate) : "",
                  }}
                  trigger={
                    <Button size="sm" variant="outline">
                      Bearbeiten
                    </Button>
                  }
                />
                <Button size="sm" variant="destructive" onClick={() => setPendingDelete(c)}>
                  Löschen
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partnerfirma löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{pendingDelete?.name}" wirklich löschen? Dies kann nicht rückgängig
              gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive">
              <AlertDescription>{deleteError}</AlertDescription>
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
    </>
  )
}
