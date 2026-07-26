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
import { assignmentStatusLabel } from "@/components/portal/assignments-table"

export interface MunicipalityAssignmentRow {
  id: string
  status: "proposed" | "accepted" | "active" | "completed"
  startDate: string | null
  endDate: string | null
  candidateName: string
}

export function MunicipalityAssignmentsTable({
  assignments,
}: {
  assignments: MunicipalityAssignmentRow[]
}) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Einsätze.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kandidat</TableHead>
          <TableHead>Zeitraum</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">{a.candidateName}</TableCell>
            <TableCell>
              {a.startDate}
              {a.endDate ? ` – ${a.endDate}` : ""}
            </TableCell>
            <TableCell>
              <Badge>{assignmentStatusLabel[a.status]}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
