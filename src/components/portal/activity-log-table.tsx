import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface ActivityLogRow {
  id: string
  entityType: string
  action: string
  actorName: string
  createdDate: string
}

const ACTIVITY_DESCRIPTIONS: Record<string, Record<string, string>> = {
  personnel_request: {
    reviewed: "Anfrage geprüft",
  },
  candidate_proposal: {
    proposed: "Kandidat vorgeschlagen",
    approved: "Vorschlag freigegeben",
    rejected: "Vorschlag abgelehnt",
    municipality_accepted: "Vorschlag von Gemeinde angenommen",
    municipality_declined: "Vorschlag von Gemeinde abgelehnt",
  },
  assignment: {
    created: "Einsatz angelegt",
    accepted: "Einsatz akzeptiert",
    active: "Einsatz aktiv gesetzt",
    completed: "Einsatz abgeschlossen",
  },
  contract: {
    generated: "Vertrag generiert",
    signed: "Vertrag unterschrieben",
  },
  candidate_note: {
    note_added: "Interne Notiz zu Kandidat hinzugefügt",
    note_deleted: "Interne Notiz zu Kandidat gelöscht",
  },
  request_note: {
    note_added: "Interne Notiz zu Anfrage hinzugefügt",
    note_deleted: "Interne Notiz zu Anfrage gelöscht",
  },
  assignment_note: {
    note_added: "Interne Notiz zu Einsatz hinzugefügt",
    note_deleted: "Interne Notiz zu Einsatz gelöscht",
  },
}

export function describeActivity(entityType: string, action: string): string {
  return ACTIVITY_DESCRIPTIONS[entityType]?.[action] ?? `${entityType}: ${action}`
}

export function ActivityLogTable({ entries }: { entries: ActivityLogRow[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Aktivitäten.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Akteur</TableHead>
          <TableHead>Ereignis</TableHead>
          <TableHead>Zeitpunkt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-medium">{entry.actorName}</TableCell>
            <TableCell>{describeActivity(entry.entityType, entry.action)}</TableCell>
            <TableCell>
              {new Date(entry.createdDate).toLocaleString("de-CH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
