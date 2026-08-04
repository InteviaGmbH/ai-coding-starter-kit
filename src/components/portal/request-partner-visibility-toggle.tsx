"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { setRequestVisibleToPartners } from "@/app/internal/requests/actions"

export function RequestPartnerVisibilityToggle({
  requestId,
  visibleToPartners,
}: {
  requestId: string
  visibleToPartners: boolean
}) {
  const router = useRouter()
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle(checked: boolean) {
    setToggling(true)
    setError(null)
    const result = await setRequestVisibleToPartners(requestId, checked)
    setToggling(false)

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
      <div className="flex items-center gap-2">
        <Switch
          id="visible-to-partners"
          checked={visibleToPartners}
          disabled={toggling}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="visible-to-partners" className="text-sm text-muted-foreground">
          Für Partnerfirmen freigeben
        </Label>
      </div>
    </div>
  )
}
