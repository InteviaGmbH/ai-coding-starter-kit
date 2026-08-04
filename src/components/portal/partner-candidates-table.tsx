"use client"

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
import { PartnerCandidateFormDialog } from "@/components/portal/partner-candidate-form-dialog"

export interface PartnerCandidateRow {
  id: string
  firstName: string
  lastName: string
  skills: string[]
  region: string | null
  availability: string | null
}

export function PartnerCandidatesTable({ candidates }: { candidates: PartnerCandidateRow[] }) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine eigenen Kandidaten erfasst.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Fähigkeiten</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Verfügbarkeit</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">
              {c.firstName} {c.lastName}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {c.skills.length > 0 ? (
                  c.skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>
            <TableCell>{c.region || "—"}</TableCell>
            <TableCell>{c.availability || "—"}</TableCell>
            <TableCell className="text-right">
              <PartnerCandidateFormDialog
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
