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

export interface AssignmentRow {
  id: string
  status: "proposed" | "accepted" | "active" | "completed"
  startDate: string | null
  endDate: string | null
  candidateName: string
  municipalityName: string
}

export const assignmentStatusLabel: Record<AssignmentRow["status"], string> = {
  proposed: "Vorgeschlagen",
  accepted: "Akzeptiert",
  active: "Aktiv",
  completed: "Abgeschlossen",
}

const statusVariant: Record<AssignmentRow["status"], "default" | "secondary"> = {
  proposed: "secondary",
  accepted: "secondary",
  active: "default",
  completed: "default",
}

export function AssignmentsTable({ assignments }: { assignments: AssignmentRow[] }) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Einsätze angelegt.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kandidat</TableHead>
          <TableHead>Gemeinde</TableHead>
          <TableHead>Zeitraum</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((a) => (
          <TableRow key={a.id}>
            <TableCell>
              <Link href={`/internal/assignments/${a.id}`} className="font-medium hover:underline">
                {a.candidateName}
              </Link>
            </TableCell>
            <TableCell>{a.municipalityName}</TableCell>
            <TableCell>
              {a.startDate}
              {a.endDate ? ` – ${a.endDate}` : ""}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[a.status]}>{assignmentStatusLabel[a.status]}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
