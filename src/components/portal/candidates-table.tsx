"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
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
import { CandidateFormDialog } from "@/components/portal/candidate-form-dialog"
import { deleteCandidate } from "@/app/internal/candidates/actions"

export interface CandidateRow {
  id: string
  firstName: string
  lastName: string
  skills: string[]
  region: string | null
  availability: string | null
  sourceType: "dafinex" | "partner"
  hasAccount: boolean
  partnerCompanyName: string | null
}

// Partner-sourced candidates never have their own account (see PROJ-13
// scope decision), so `hasAccount` alone can't be used to infer "intern
// erfasst" — that used to wrongly label every partner candidate as
// internally created (BUG-13-1).
function originLabel(c: CandidateRow): string {
  if (c.hasAccount) return "Selbst registriert"
  if (c.sourceType === "partner") return c.partnerCompanyName ? `Partnerfirma: ${c.partnerCompanyName}` : "Partnerfirma"
  return "Intern erfasst"
}

function matches(candidate: CandidateRow, query: string) {
  if (!query) return true
  const haystack = [
    candidate.firstName,
    candidate.lastName,
    candidate.region ?? "",
    ...candidate.skills,
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(query.toLowerCase())
}

export function CandidatesTable({ candidates }: { candidates: CandidateRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pendingDelete, setPendingDelete] = useState<CandidateRow | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(
    () => candidates.filter((c) => matches(c, query)),
    [candidates, query]
  )

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)

    const result = await deleteCandidate(pendingDelete.id)

    setDeleting(false)

    if (!result.success) {
      setDeleteError(result.error ?? "Löschen fehlgeschlagen.")
      return
    }

    setPendingDelete(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Suche nach Name, Region oder Fähigkeit…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />

      {candidates.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Noch keine Kandidaten erfasst.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Keine Kandidaten gefunden.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Fähigkeiten</TableHead>
              <TableHead>Verfügbarkeit</TableHead>
              <TableHead>Herkunft</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const shortSkills = c.skills.slice(0, 3).join(", ")
              const remaining = c.skills.length - 3
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/internal/candidates/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{c.region ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate" title={c.skills.join(", ")}>
                    {c.skills.length > 0 ? `${shortSkills}${remaining > 0 ? ` +${remaining} weitere` : ""}` : "—"}
                  </TableCell>
                  <TableCell>{c.availability ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.sourceType === "partner" && !c.hasAccount ? "outline" : "secondary"}>
                      {originLabel(c)}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <CandidateFormDialog
                      mode="edit"
                      candidateId={c.id}
                      defaultValues={{
                        firstName: c.firstName,
                        lastName: c.lastName,
                        skills: c.skills.join(", "),
                        region: c.region ?? "",
                        availability: c.availability ?? "",
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
              )
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kandidat löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du „{pendingDelete?.firstName} {pendingDelete?.lastName}" wirklich löschen?
              Dies kann nicht rückgängig gemacht werden.
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
    </div>
  )
}
