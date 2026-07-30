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
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProposeCandidateButton } from "@/components/portal/propose-candidate-button"
import type { MatchScoreBreakdown } from "@/lib/matching/score"

export interface MatchingCandidateRow {
  id: string
  firstName: string
  lastName: string
  skills: string[]
  region: string | null
  availability: string | null
  alreadyProposed: boolean
  score: MatchScoreBreakdown
}

interface Props {
  candidates: MatchingCandidateRow[]
  requestId: string
  requestReviewed: boolean
}

function scoreBadgeVariant(overall: number): "default" | "secondary" | "outline" {
  if (overall >= 70) return "default"
  if (overall >= 40) return "secondary"
  return "outline"
}

export function MatchingCandidatesTable({ candidates, requestId, requestReviewed }: Props) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Kandidaten vorhanden.
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
          <TableHead>Score</TableHead>
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
            <TableCell>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label={`Score-Aufschlüsselung für ${c.firstName} ${c.lastName}`}>
                    <Badge variant={scoreBadgeVariant(c.score.overall)}>
                      {Math.round(c.score.overall)}%
                    </Badge>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-2 text-sm">
                  <p className="font-medium">Score-Aufschlüsselung</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fähigkeiten</span>
                    <span>{Math.round(c.score.skills)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Region</span>
                    <span>{Math.round(c.score.region)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verfügbarkeit</span>
                    <span>{Math.round(c.score.availability)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pensum</span>
                    <span>{Math.round(c.score.workload)}%</span>
                  </div>
                </PopoverContent>
              </Popover>
            </TableCell>
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
