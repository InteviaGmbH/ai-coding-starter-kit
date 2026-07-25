"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { markRequestReviewed } from "@/app/internal/requests/actions"

export function InternalRequestDetailActions({
  requestId,
  status,
}: {
  requestId: string
  status: "created" | "reviewed"
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const result = await markRequestReviewed(requestId)
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
      <Button disabled={status === "reviewed" || loading} onClick={handleClick}>
        {loading ? "Wird markiert…" : "Als geprüft markieren"}
      </Button>
    </div>
  )
}
