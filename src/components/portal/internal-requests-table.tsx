"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { markRequestReviewed } from "@/app/internal/requests/actions"

export interface InternalRequestRow {
  id: string
  title: string
  municipalityName: string
  startDate: string
  endDate: string | null
  status: "created" | "reviewed"
  createdDate: string
}

const statusLabel: Record<string, string> = { created: "Erstellt", reviewed: "Geprüft" }

const dateFormatter = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function InternalRequestsTable({ requests }: { requests: InternalRequestRow[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleMarkReviewed(id: string) {
    setLoadingId(id)
    setError(null)

    const result = await markRequestReviewed(id)

    setLoadingId(null)

    if (!result.success) {
      setError(result.error ?? "Aktion fehlgeschlagen.")
      return
    }

    router.refresh()
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Personalanfragen vorhanden.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead>
            <TableHead>Gemeinde</TableHead>
            <TableHead>Erstellt am</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link href={`/internal/requests/${r.id}`} className="font-medium hover:underline">
                  {r.title}
                </Link>
              </TableCell>
              <TableCell>{r.municipalityName}</TableCell>
              <TableCell>{dateFormatter.format(new Date(r.createdDate))}</TableCell>
              <TableCell>
                <Badge variant={r.status === "reviewed" ? "default" : "secondary"}>
                  {statusLabel[r.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={r.status === "reviewed" || loadingId === r.id}
                  onClick={() => handleMarkReviewed(r.id)}
                >
                  {loadingId === r.id ? "Wird markiert…" : "Als geprüft markieren"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
