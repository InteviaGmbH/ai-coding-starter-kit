"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApproveRejectDialog } from "@/components/portal/approve-reject-dialog"

export interface PendingAccount {
  id: string
  email: string
  fullName: string | null
  role: "municipality" | "candidate"
  createdDate: string
  candidate: {
    skills: string[]
    region: string | null
    availability: string | null
    hasCv: boolean
  } | null
}

interface Municipality {
  id: string
  name: string
}

const dateFormatter = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function PendingAccountsTable({
  accounts,
  municipalities,
}: {
  accounts: PendingAccount[]
  municipalities: Municipality[]
}) {
  const [selected, setSelected] = useState<PendingAccount | null>(null)

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aktuell keine ausstehenden Registrierungen.
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Rolle</TableHead>
            <TableHead>Registriert am</TableHead>
            <TableHead className="text-right">Aktion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell>{account.fullName ?? "—"}</TableCell>
              <TableCell>{account.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {account.role === "municipality" ? "Gemeinde" : "Kandidat"}
                </Badge>
              </TableCell>
              <TableCell>{dateFormatter.format(new Date(account.createdDate))}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => setSelected(account)}>
                  Prüfen
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selected && (
        <ApproveRejectDialog
          account={selected}
          municipalities={municipalities}
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
        />
      )}
    </>
  )
}
