"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { markRequestReviewed, setRequestVisibleToPartners } from "@/app/internal/requests/actions"

export function InternalRequestDetailActions({
  requestId,
  status,
  visibleToPartners,
}: {
  requestId: string
  status: "created" | "reviewed"
  visibleToPartners: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [togglingVisibility, setTogglingVisibility] = useState(false)
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

  async function handleVisibilityToggle(checked: boolean) {
    setTogglingVisibility(true)
    setError(null)
    const result = await setRequestVisibleToPartners(requestId, checked)
    setTogglingVisibility(false)

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
      <div className="flex items-center justify-end gap-2">
        <Label htmlFor="visible-to-partners" className="text-sm text-muted-foreground">
          Für Partnerfirmen freigeben
        </Label>
        <Switch
          id="visible-to-partners"
          checked={visibleToPartners}
          disabled={togglingVisibility}
          onCheckedChange={handleVisibilityToggle}
        />
      </div>
      <div className="flex justify-end">
        <Button disabled={status === "reviewed" || loading} onClick={handleClick}>
          {loading ? "Wird markiert…" : "Als geprüft markieren"}
        </Button>
      </div>
    </div>
  )
}
