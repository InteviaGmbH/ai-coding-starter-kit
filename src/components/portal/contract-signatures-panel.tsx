"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { PartySignatureData } from "@/lib/contracts/loadSignatures"
import type { PartyType, SignDigitalInput } from "@/lib/contracts/schema"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"]

const PARTY_LABELS: Record<PartyType, string> = {
  dafinex: "Dafinex",
  municipality: "Gemeinde",
  candidate: "Kandidat",
}

interface ActionResult {
  success: boolean
  error?: string
}

interface Props {
  assignmentId: string
  signatures: PartySignatureData[]
  viewerParty: PartyType | null
  isInternalViewer: boolean
  candidateHasAccount: boolean
  defaultSignerName: string
  onSignDigital?: (input: SignDigitalInput) => Promise<ActionResult>
  onUploadCandidateFallback?: (filePath: string) => Promise<ActionResult>
}

function SignatureForm({
  defaultSignerName,
  onSubmit,
}: {
  defaultSignerName: string
  onSubmit: (input: SignDigitalInput) => Promise<void>
}) {
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    if (!signerName.trim()) {
      setError("Name ist erforderlich.")
      return
    }
    if (!agreed) {
      setError("Bitte der Zustimmung zustimmen.")
      return
    }

    setSubmitting(true)
    await onSubmit({ signerName: signerName.trim(), agreed: true })
    setSubmitting(false)
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div>
        <Label>Name</Label>
        <Input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="signature-agree"
          checked={agreed}
          disabled={submitting}
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <Label htmlFor="signature-agree" className="text-sm font-normal">
          Ich stimme zu und unterschreibe hiermit.
        </Label>
      </div>
      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Wird gespeichert…" : "Digital unterschreiben"}
      </Button>
    </div>
  )
}

export function ContractSignaturesPanel({
  assignmentId,
  signatures,
  viewerParty,
  isInternalViewer,
  candidateHasAccount,
  defaultSignerName,
  onSignDigital,
  onUploadCandidateFallback,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleSignSubmit(input: SignDigitalInput) {
    if (!onSignDigital) return
    setError(null)
    const result = await onSignDigital(input)
    if (!result.success) {
      setError(result.error ?? "Unterschrift konnte nicht gespeichert werden.")
      return
    }
    router.refresh()
  }

  async function handleFallbackUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !onUploadCandidateFallback) return

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Nur PDF, JPG oder PNG erlaubt.")
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Datei darf maximal 10 MB gross sein.")
      return
    }

    setError(null)
    setUploading(true)

    const supabase = createClient()
    const path = `${assignmentId}/candidate-signature-${crypto.randomUUID()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from("contracts").upload(path, file)

    if (uploadError) {
      setUploading(false)
      setError("Datei konnte nicht hochgeladen werden.")
      return
    }

    const result = await onUploadCandidateFallback(path)
    setUploading(false)

    if (!result.success) {
      setError(result.error ?? "Datei konnte nicht gespeichert werden.")
      return
    }

    router.refresh()
  }

  const allSigned = signatures.every((s) => s.signedAt !== null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unterschriften</CardTitle>
        <p className="text-sm text-muted-foreground">
          {allSigned
            ? "Vollständig unterschrieben."
            : `${signatures.filter((s) => s.signedAt).length} von ${signatures.length} Parteien haben unterschrieben.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {signatures.map((sig) => (
          <div key={sig.partyType} className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{PARTY_LABELS[sig.partyType]}</span>
              {sig.signedAt ? (
                <Badge>Unterschrieben</Badge>
              ) : (
                <Badge variant="secondary">Offen</Badge>
              )}
            </div>

            {sig.signedAt ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Unterschrieben am {new Date(sig.signedAt).toLocaleString("de-CH")} von{" "}
                  {sig.signerName ?? "Unbekannt"}
                  {sig.method === "upload" && " (Datei-Upload)"}
                </p>
                {sig.downloadUrl && (
                  <a
                    href={sig.downloadUrl}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Hochgeladene Datei herunterladen
                  </a>
                )}
              </div>
            ) : sig.partyType === viewerParty && onSignDigital ? (
              <SignatureForm defaultSignerName={defaultSignerName} onSubmit={handleSignSubmit} />
            ) : isInternalViewer &&
              sig.partyType === "candidate" &&
              !candidateHasAccount &&
              onUploadCandidateFallback ? (
              <div>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFallbackUpload}
                  disabled={uploading}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Kandidat hat kein Portal-Konto — unterschriebene Kopie hochladen (PDF, JPG oder
                  PNG, max. 10 MB).
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Noch nicht unterschrieben.</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
