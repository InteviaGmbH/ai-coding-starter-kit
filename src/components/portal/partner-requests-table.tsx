"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProposePartnerCandidateDialog } from "@/components/portal/propose-partner-candidate-dialog"

export interface PartnerRequestRow {
  id: string
  title: string
  requiredSkills: string[]
  region: string | null
  startDate: string
  endDate: string | null
  requiredWorkloadPercent: number | null
}

interface OwnCandidate {
  id: string
  firstName: string
  lastName: string
}

export function PartnerRequestsTable({
  requests,
  ownCandidates,
}: {
  requests: PartnerRequestRow[]
  ownCandidates: OwnCandidate[]
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aktuell keine für Partnerfirmen freigegebenen Anfragen.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titel</TableHead>
          <TableHead>Fähigkeiten</TableHead>
          <TableHead>Region</TableHead>
          <TableHead>Zeitraum</TableHead>
          <TableHead>Pensum</TableHead>
          <TableHead className="text-right">Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.title}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {r.requiredSkills.length > 0 ? (
                  r.requiredSkills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>
            <TableCell>{r.region || "—"}</TableCell>
            <TableCell>
              {r.startDate}
              {r.endDate ? ` – ${r.endDate}` : ""}
            </TableCell>
            <TableCell>{r.requiredWorkloadPercent != null ? `${r.requiredWorkloadPercent}%` : "—"}</TableCell>
            <TableCell className="text-right">
              <ProposePartnerCandidateDialog
                requestId={r.id}
                requestTitle={r.title}
                ownCandidates={ownCandidates}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
