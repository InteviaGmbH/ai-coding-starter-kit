"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export interface MatchingCandidateRow {
  id: string
  firstName: string
  lastName: string
  skills: string[]
  region: string | null
  availability: string | null
}

export function MatchingCandidatesTable({ candidates }: { candidates: MatchingCandidateRow[] }) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Keine passenden Kandidaten gefunden. Filter anpassen oder entfernen, um mehr Ergebnisse zu sehen.
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
          <TableHead className="text-right">Aktion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <Link href={`/internal/candidates/${c.id}`} className="font-medium hover:underline">
                {c.firstName} {c.lastName}
              </Link>
            </TableCell>
            <TableCell className="max-w-xs truncate" title={c.skills.join(", ")}>
              {c.skills.join(", ") || "—"}
            </TableCell>
            <TableCell>{c.region ?? "—"}</TableCell>
            <TableCell>{c.availability ?? "—"}</TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                disabled
                title="Kandidatenvorschlag folgt mit PROJ-7 (noch nicht verfügbar)"
              >
                Kandidat vorschlagen
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
