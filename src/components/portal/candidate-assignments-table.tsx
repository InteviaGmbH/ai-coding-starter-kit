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
import { assignmentStatusLabel } from "@/components/portal/assignments-table"

export interface CandidateAssignmentRow {
  id: string
  status: "proposed" | "accepted" | "active" | "completed"
  startDate: string | null
  endDate: string | null
  municipalityName: string
}

export function CandidateAssignmentsTable({ assignments }: { assignments: CandidateAssignmentRow[] }) {
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
          <TableHead>Gemeinde</TableHead>
          <TableHead>Zeitraum</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => (
          <TableRow key={a.id}>
            <TableCell className="font-medium">
              <Link href={`/candidate/assignments/${a.id}`} className="hover:underline">
                {a.municipalityName}
              </Link>
            </TableCell>
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
