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
import { MunicipalityFormDialog } from "@/components/portal/municipality-form-dialog"
import { deleteMunicipality } from "@/app/internal/municipalities/actions"

export interface MunicipalityRow {
  id: string
  name: string
  address: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  activeContactCount: number
}

export function MunicipalitiesTable({ municipalities }: { municipalities: MunicipalityRow[] }) {
  const router = useRouter()
  const [pendingDelete, setPendingDelete] = useState<MunicipalityRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)

    const result = await deleteMunicipality(pendingDelete.id)

    setDeleting(false)

    if (!result.success) {
      setDeleteError(result.error ?? "Löschen fehlgeschlagen.")
      return
    }

    setPendingDelete(null)
    router.refresh()
  }

  if (municipalities.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Gemeinden erfasst.
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
            <TableHead>Aktive Ansprechpartner</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {municipalities.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <Link href={`/internal/municipalities/${m.id}`} className="font-medium hover:underline">
                  {m.name}
                </Link>
              </TableCell>
              <TableCell className="max-w-xs truncate" title={m.address ?? undefined}>
                {m.address ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{m.activeContactCount}</Badge>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <MunicipalityFormDialog
                  mode="edit"
                  municipalityId={m.id}
                  defaultValues={{
                    name: m.name,
                    address: m.address ?? "",
                    contactName: m.contactName ?? "",
                    contactEmail: m.contactEmail ?? "",
                    contactPhone: m.contactPhone ?? "",
                  }}
                  trigger={
                    <Button size="sm" variant="outline">
                      Bearbeiten
                    </Button>
                  }
                />
                <Button size="sm" variant="destructive" onClick={() => setPendingDelete(m)}>
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
            <AlertDialogTitle>Gemeinde löschen?</AlertDialogTitle>
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
            {/* Plain Button, not AlertDialogAction: Radix closes AlertDialogAction on
                click regardless of outcome, which would hide the delete error below. */}
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Wird gelöscht…" : "Löschen"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
