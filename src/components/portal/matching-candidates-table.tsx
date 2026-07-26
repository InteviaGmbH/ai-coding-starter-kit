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
import { ProposeCandidateButton } from "@/components/portal/propose-candidate-button"

export interface MatchingCandidateRow {
  id: string
  firstName: string
  lastName: string
  skills: string[]
  region: string | null
  availability: string | null
  alreadyProposed: boolean
}

interface Props {
  candidates: MatchingCandidateRow[]
  requestId: string
  requestReviewed: boolean
}

export function MatchingCandidatesTable({ candidates, requestId, requestReviewed }: Props) {
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
              <ProposeCandidateButton
                requestId={requestId}
                candidateId={c.id}
                candidateName={`${c.firstName} ${c.lastName}`}
                disabled={!requestReviewed || c.alreadyProposed}
                disabledReason={
                  !requestReviewed
                    ? "Die Anfrage muss zuerst geprüft werden, bevor Kandidaten vorgeschlagen werden können."
                    : c.alreadyProposed
                      ? "Dieser Kandidat wurde bereits vorgeschlagen und wartet auf Entscheidung."
                      : undefined
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
