"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { proposeCandidateAsPartner } from "@/app/partner/proposals/actions"

interface OwnCandidate {
  id: string
  firstName: string
  lastName: string
}

export function ProposePartnerCandidateDialog({
  requestId,
  requestTitle,
  ownCandidates,
}: {
  requestId: string
  requestTitle: string
  ownCandidates: OwnCandidate[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [candidateId, setCandidateId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!candidateId) {
      setError("Bitte einen Kandidaten auswählen.")
      return
    }
    setLoading(true)
    setError(null)

    const result = await proposeCandidateAsPartner(requestId, candidateId)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Vorschlag konnte nicht angelegt werden.")
      return
    }

    setOpen(false)
    setCandidateId(undefined)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={ownCandidates.length === 0}>
          Kandidat vorschlagen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kandidat vorschlagen für „{requestTitle}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {ownCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine eigenen Kandidaten erfasst.
            </p>
          ) : (
            <Select value={candidateId} onValueChange={setCandidateId}>
              <SelectTrigger>
                <SelectValue placeholder="Kandidat auswählen" />
              </SelectTrigger>
              <SelectContent>
                {ownCandidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || ownCandidates.length === 0}>
            {loading ? "Wird vorgeschlagen…" : "Vorschlagen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
