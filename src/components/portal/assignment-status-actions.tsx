"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { advanceAssignmentStatus } from "@/app/internal/assignments/actions"
import { assignmentStatusLabel } from "@/components/portal/assignments-table"

const STATUS_ORDER = ["proposed", "accepted", "active", "completed"] as const
type AssignmentStatus = (typeof STATUS_ORDER)[number]

export function AssignmentStatusActions({
  assignmentId,
  status,
}: {
  assignmentId: string
  status: AssignmentStatus
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentIndex = STATUS_ORDER.indexOf(status)
  const isFinal = currentIndex === STATUS_ORDER.length - 1
  const nextStatus = isFinal ? null : STATUS_ORDER[currentIndex + 1]

  async function handleClick() {
    setLoading(true)
    setError(null)
    const result = await advanceAssignmentStatus(assignmentId)
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Aktion fehlgeschlagen.")
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        disabled={isFinal || loading}
        title={isFinal ? "Dieser Einsatz hat bereits die letzte Stufe erreicht." : undefined}
        onClick={handleClick}
      >
        {loading
          ? "Wird aktualisiert…"
          : isFinal
            ? "Abgeschlossen"
            : `Nächster Schritt: ${assignmentStatusLabel[nextStatus!]}`}
      </Button>
    </div>
  )
}
